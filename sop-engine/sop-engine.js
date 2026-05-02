/**
 * TWI SOP Engine — Core library for SOP indexing, search, and execution.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * WHAT THIS IS:
 *   A standalone module that manages the lifecycle of SOPs (Standard
 *   Operating Procedures) extruded by the TWI Jobworld server.
 *
 *   SOPs are JSON configs that capture repeatable business processes.
 *   Each SOP has:
 *     - domain/subdomain/process namespace (hierarchical)
 *     - input_signature (function parameters — what the CEO fills in)
 *     - steps (ordered agent actions recorded during the flow)
 *     - tags (for cross-cutting search)
 *
 * HOW SOPS ARE CREATED:
 *   1. CEO emits a start event with filled-in KV:
 *        POST /api/emit-event {
 *          source: "ceo",
 *          observation: {
 *            type: "sop_start",
 *            domain: "Engineering",
 *            subdomain: "DevOps",
 *            process: "Infrastructure Audit",
 *            tags: ["ci-cd", "security"],
 *            kv: { repo_url: "my-repo", target_env: "production" }
 *          }
 *        }
 *
 *   2. Agents do work. Events accumulate in the flow.
 *
 *   3. CEO emits an end event:
 *        POST /api/emit-event {
 *          source: "ceo",
 *          observation: { type: "sop_end", process: "Infrastructure Audit" }
 *        }
 *
 *   4. Server extrudes a JSON config to sops/{domain}/{subdomain}/{slug}.json
 *      The CEO's start-event KV keys become the input_signature.
 *      The recorded events become the steps.
 *
 * HOW THIS MODULE FITS IN:
 *   - init()    → creates the SQLite DB with FTS5 tables
 *   - index()   → scans the sops/ directory and indexes all JSON files
 *   - search()  → BM25 keyword search across all indexed SOPs
 *   - get()     → retrieve a single SOP by slug
 *   - list()    → list all indexed SOPs
 *   - run()     → emit a sop_start event to the server with filled KV
 *
 * SKILL INTEGRATION (for the future):
 *   Wrap this module in a SKILL.md that triggers on:
 *     "run SOP", "find SOP", "list SOPs", "search procedures",
 *     "show SOP", "execute process"
 *
 *   The skill should:
 *     1. Call search() or list() to find the right SOP
 *     2. Show the CEO the input_signature params
 *     3. Prompt the CEO to fill in the values
 *     4. Call run() to emit the sop_start event
 *     5. Monitor /api/flows for completion
 *     6. On sop_end, confirm the SOP extruded successfully
 *
 * SEARCH ARCHITECTURE (OpenClaw-inspired):
 *   Uses SQLite FTS5 with BM25 ranking for keyword search.
 *   Searches across: name, domain, subdomain, tags, step actions.
 *
 *   sql.js is pure JS/WASM — zero native deps, works everywhere.
 *   DB persists to disk via manual save after writes.
 *
 *   Future: add vector search with weighted merge
 *   (0.4 * bm25 + 0.6 * vector). Degrades gracefully to
 *   BM25-only when embeddings unavailable.
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, 'sops.db');
const DEFAULT_SOPS_DIR = path.join(__dirname, '..', 'template', 'twi-jobworld-template', 'sops');

class SOPEngine {
  /**
   * @param {Object} opts
   * @param {string} opts.dbPath    - Path to SQLite database file
   * @param {string} opts.sopsDir   - Path to sops/ directory with extruded JSON configs
   * @param {string} opts.serverUrl - TWI Jobworld server URL (for run/emit commands)
   */
  constructor(opts = {}) {
    this.dbPath = opts.dbPath || DEFAULT_DB_PATH;
    this.sopsDir = opts.sopsDir || DEFAULT_SOPS_DIR;
    this.serverUrl = opts.serverUrl || 'http://localhost:3847';
    this.db = null;
  }

  // ════════════════════════════════════════════════════
  // INIT — Create the SQLite DB (sql.js is async init)
  // ════════════════════════════════════════════════════

  /**
   * Initialize the database. Loads from disk if exists, creates new otherwise.
   * Must be called (awaited) before any other method.
   */
  async init() {
    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    // Note: sql.js doesn't support FTS5 natively (it's a loadable extension).
    // We use a regular table with LIKE-based search + manual BM25-style scoring.
    // This is the pragmatic tradeoff for zero-native-dep portability.
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sops (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        domain TEXT NOT NULL,
        subdomain TEXT NOT NULL,
        tags TEXT,
        input_signature TEXT,
        steps TEXT,
        step_actions TEXT,
        run_count INTEGER DEFAULT 0,
        created_at TEXT,
        completed_at TEXT,
        raw_json TEXT
      )
    `);

    return this;
  }

  /** Persist database to disk */
  _save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dbPath, buffer);
  }

  // ════════════════════════════════════════════════════
  // INDEX — Scan sops/ directory and index all JSON files
  // ════════════════════════════════════════════════════

  /**
   * Walk the sops/ directory tree and index every .json file.
   * Directory structure: sops/{domain}/{subdomain}/{slug}.json
   *
   * Upserts — safe to re-run after new SOPs are extruded.
   *
   * @param {string} [dir] - Override sops directory path
   * @returns {{ indexed: number, errors: string[] }}
   */
  index(dir) {
    const sopsDir = dir || this.sopsDir;
    if (!this.db) throw new Error('Call init() first');

    let indexed = 0;
    const errors = [];

    const upsertSop = (sop, rawJson) => {
      const stepActions = (sop.steps || [])
        .map(s => `${s.agent}: ${s.action}`)
        .join(' | ');

      // Delete existing, then insert (upsert pattern for sql.js)
      this.db.run('DELETE FROM sops WHERE id = ?', [sop.id]);
      this.db.run(
        `INSERT INTO sops (id, slug, name, version, domain, subdomain, tags, input_signature, steps, step_actions, run_count, created_at, completed_at, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sop.id,
          sop.slug,
          sop.name,
          sop.version || 1,
          sop.domain || 'General',
          sop.subdomain || 'Default',
          (sop.tags || []).join(', '),
          JSON.stringify(sop.input_signature || {}),
          JSON.stringify(sop.steps || []),
          stepActions,
          sop.run_count || 0,
          sop.created_at || null,
          sop.completed_at || null,
          rawJson,
        ]
      );
      indexed++;
    };

    // Walk filesystem
    const walk = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.json')) {
          try {
            const raw = fs.readFileSync(full, 'utf-8');
            const sop = JSON.parse(raw);
            upsertSop(sop, raw);
          } catch (e) {
            errors.push(`${full}: ${e.message}`);
          }
        }
      }
    };

    walk(sopsDir);

    // Fallback: index from server store (data.json)
    if (indexed === 0) {
      const dataPath = path.join(this.sopsDir, '..', 'event-stream', 'data.json');
      if (fs.existsSync(dataPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          for (const sop of Object.values(data.sops || {})) {
            upsertSop(sop, JSON.stringify(sop, null, 2));
          }
        } catch (e) {
          errors.push(`data.json fallback: ${e.message}`);
        }
      }
    }

    this._save();
    return { indexed, errors };
  }

  // ════════════════════════════════════════════════════
  // SEARCH — Keyword search with manual BM25-style scoring
  // ════════════════════════════════════════════════════

  /**
   * Search SOPs using keyword matching with term-frequency scoring.
   * Searches across: name, domain, subdomain, tags, step_actions.
   *
   * Scoring: each matching field contributes to the score with weights:
   *   name match     = 5.0 (most important)
   *   domain match   = 2.0
   *   subdomain      = 2.0
   *   tags match     = 3.0
   *   step_actions   = 1.0
   *
   * @param {string} query - Search query (space-separated keywords)
   * @param {number} [limit=10] - Max results
   * @returns {Array<Object>} - Ranked results
   */
  search(query, limit = 10) {
    if (!this.db) throw new Error('Call init() first');

    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    // Get all SOPs and score them
    const rows = this.db.exec('SELECT * FROM sops');
    if (!rows.length || !rows[0].values.length) return [];

    const columns = rows[0].columns;
    const scored = [];

    for (const row of rows[0].values) {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });

      let score = 0;
      const fields = {
        name: { val: (obj.name || '').toLowerCase(), weight: 5.0 },
        domain: { val: (obj.domain || '').toLowerCase(), weight: 2.0 },
        subdomain: { val: (obj.subdomain || '').toLowerCase(), weight: 2.0 },
        tags: { val: (obj.tags || '').toLowerCase(), weight: 3.0 },
        step_actions: { val: (obj.step_actions || '').toLowerCase(), weight: 1.0 },
      };

      for (const term of terms) {
        for (const [, field] of Object.entries(fields)) {
          if (field.val.includes(term)) {
            score += field.weight;
          }
        }
      }

      if (score > 0) {
        scored.push({
          ...obj,
          tags: obj.tags ? obj.tags.split(', ') : [],
          input_signature: JSON.parse(obj.input_signature || '{}'),
          steps: JSON.parse(obj.steps || '[]'),
          score,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  // ════════════════════════════════════════════════════
  // GET — Retrieve a single SOP by slug
  // ════════════════════════════════════════════════════

  /**
   * @param {string} slug - SOP slug (e.g. "infrastructure-audit")
   * @returns {Object|null}
   */
  get(slug) {
    if (!this.db) throw new Error('Call init() first');
    const result = this.db.exec('SELECT * FROM sops WHERE slug = ?', [slug]);
    if (!result.length || !result[0].values.length) return null;

    const columns = result[0].columns;
    const row = result[0].values[0];
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });

    return {
      ...obj,
      tags: obj.tags ? obj.tags.split(', ') : [],
      input_signature: JSON.parse(obj.input_signature || '{}'),
      steps: JSON.parse(obj.steps || '[]'),
    };
  }

  // ════════════════════════════════════════════════════
  // LIST — List all indexed SOPs
  // ════════════════════════════════════════════════════

  /**
   * @param {Object} [filter]
   * @param {string} [filter.domain] - Filter by domain
   * @param {string} [filter.subdomain] - Filter by subdomain
   * @returns {Array<Object>}
   */
  list(filter = {}) {
    if (!this.db) throw new Error('Call init() first');

    let sql = 'SELECT id, slug, name, version, domain, subdomain, tags, run_count, created_at FROM sops';
    const params = [];

    if (filter.domain) {
      sql += ' WHERE domain = ?';
      params.push(filter.domain);
      if (filter.subdomain) {
        sql += ' AND subdomain = ?';
        params.push(filter.subdomain);
      }
    }

    sql += ' ORDER BY created_at DESC';

    const result = this.db.exec(sql, params);
    if (!result.length) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      obj.tags = obj.tags ? obj.tags.split(', ') : [];
      return obj;
    });
  }

  // ════════════════════════════════════════════════════
  // RUN — Emit a sop_start event to kick off a flow
  // ════════════════════════════════════════════════════

  /**
   * Start a new SOP run by emitting a sop_start event to the server.
   *
   * @param {string} slug - SOP slug to run
   * @param {Object} inputValues - Filled-in KV values for input_signature
   * @returns {Promise<Object>} - Server response
   *
   * @example
   *   await engine.run('infrastructure-audit', {
   *     repo_url: 'crystal-ball',
   *     target_env: 'staging'
   *   });
   */
  async run(slug, inputValues = {}) {
    const sop = this.get(slug);
    if (!sop) throw new Error(`SOP not found: ${slug}`);

    // Validate required params
    const missing = [];
    for (const [key, spec] of Object.entries(sop.input_signature)) {
      if (spec.required && !(key in inputValues)) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing required params: ${missing.join(', ')}`);
    }

    const event = {
      source: 'ceo',
      observation: {
        type: 'sop_start',
        domain: sop.domain,
        subdomain: sop.subdomain,
        process: sop.name,
        tags: sop.tags,
        kv: inputValues,
      },
    };

    const resp = await fetch(`${this.serverUrl}/api/emit-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    return resp.json();
  }

  // ════════════════════════════════════════════════════
  // END — Emit a sop_end event to close an active flow
  // ════════════════════════════════════════════════════

  /**
   * End an active SOP flow, triggering extrusion.
   *
   * @param {string} processName - The process name used in sop_start
   * @param {string} [goal] - Optional goal description
   * @returns {Promise<Object>}
   */
  async end(processName, goal) {
    const event = {
      source: 'ceo',
      observation: {
        type: 'sop_end',
        process: processName,
        goal: goal || null,
      },
    };

    const resp = await fetch(`${this.serverUrl}/api/emit-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    return resp.json();
  }

  /**
   * Close the database connection.
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = SOPEngine;
