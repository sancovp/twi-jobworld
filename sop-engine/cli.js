#!/usr/bin/env node
/**
 * TWI SOP Engine CLI
 *
 * ═══════════════════════════════════════════════════════════════════════
 * COMMANDS:
 *   sop init                        Initialize the SQLite database
 *   sop index [--dir path]          Index SOPs from filesystem
 *   sop list [--domain X]           List all SOPs (optionally filtered)
 *   sop search <query>              BM25 keyword search
 *   sop show <slug>                 Show full SOP details
 *   sop run <slug> --kv key=val     Start a new SOP run
 *   sop end <process-name>          End an active flow
 *
 * EXAMPLES:
 *   sop init
 *   sop index --dir ./sops
 *   sop search "devops infrastructure"
 *   sop list --domain Engineering
 *   sop show infrastructure-audit
 *   sop run infrastructure-audit --kv repo_url=crystal-ball --kv target_env=staging
 *   sop end "Infrastructure Audit"
 *
 * ENVIRONMENT:
 *   SOP_DB_PATH     Path to SQLite database (default: ./sops.db)
 *   SOP_DIR         Path to sops/ directory
 *   JOBWORLD_URL    Server URL (default: http://localhost:3847)
 * ═══════════════════════════════════════════════════════════════════════
 */

const SOPEngine = require('./sop-engine');

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

function getKVPairs() {
  const pairs = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--kv' && args[i + 1]) {
      const [key, ...rest] = args[i + 1].split('=');
      pairs[key] = rest.join('=');
      i++;
    }
  }
  return pairs;
}

const opts = {};
if (process.env.SOP_DB_PATH) opts.dbPath = process.env.SOP_DB_PATH;
if (getFlag('--dir') || process.env.SOP_DIR) opts.sopsDir = getFlag('--dir') || process.env.SOP_DIR;
if (process.env.JOBWORLD_URL) opts.serverUrl = process.env.JOBWORLD_URL;

const engine = new SOPEngine(opts);

async function main() {
  switch (command) {
    case 'init': {
      await engine.init();
      console.log('✅ Database initialized at:', engine.dbPath);
      break;
    }

    case 'index': {
      await engine.init();
      const result = engine.index(getFlag('--dir'));
      console.log(`✅ Indexed ${result.indexed} SOPs`);
      if (result.errors.length > 0) {
        console.log('⚠️  Errors:');
        result.errors.forEach(e => console.log('   ', e));
      }
      break;
    }

    case 'list': {
      await engine.init();
      const filter = {};
      const domain = getFlag('--domain');
      const subdomain = getFlag('--subdomain');
      if (domain) filter.domain = domain;
      if (subdomain) filter.subdomain = subdomain;

      const sops = engine.list(filter);
      if (sops.length === 0) {
        console.log('No SOPs found. Run `sop index` first.');
        break;
      }

      console.log(`\n  ⚙️  ${sops.length} SOPs\n`);
      sops.forEach(s => {
        console.log(`  ${s.slug}`);
        console.log(`    ${s.domain} › ${s.subdomain} │ v${s.version} │ ×${s.run_count} runs`);
        if (s.tags.length) console.log(`    tags: ${s.tags.join(', ')}`);
        console.log('');
      });
      break;
    }

    case 'search': {
      const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
      if (!query) {
        console.error('Usage: sop search <query>');
        process.exit(1);
      }

      await engine.init();
      const results = engine.search(query);

      if (results.length === 0) {
        console.log('No results found for:', query);
        break;
      }

      console.log(`\n  🔍 ${results.length} results for "${query}"\n`);
      results.forEach((r, i) => {
        const score = r.bm25_score ? ` (score: ${r.bm25_score.toFixed(3)})` : '';
        console.log(`  ${i + 1}. ${r.name}${score}`);
        console.log(`     ${r.domain} › ${r.subdomain}`);
        console.log(`     params: ${Object.keys(r.input_signature).join(', ') || 'none'}`);
        console.log(`     ${r.steps.length} steps │ v${r.version} │ ×${r.run_count} runs`);
        console.log('');
      });
      break;
    }

    case 'show': {
      const slug = args[1];
      if (!slug) {
        console.error('Usage: sop show <slug>');
        process.exit(1);
      }

      await engine.init();
      const sop = engine.get(slug);
      if (!sop) {
        console.error('SOP not found:', slug);
        process.exit(1);
      }

      console.log(`\n  ⚙️  ${sop.name} (v${sop.version})`);
      console.log(`  ${sop.domain} › ${sop.subdomain}`);
      console.log(`  tags: ${sop.tags.join(', ')}`);
      console.log(`  runs: ${sop.run_count} │ created: ${sop.created_at}`);

      console.log('\n  INPUT SIGNATURE:');
      for (const [key, spec] of Object.entries(sop.input_signature)) {
        const req = spec.required ? '(required)' : '(optional)';
        console.log(`    ${key}: ${spec.type} ${req} — e.g. "${spec.example}"`);
      }

      console.log('\n  STEPS:');
      sop.steps.forEach(s => {
        console.log(`    ${s.order}. [${s.agent}] ${s.action}`);
      });

      console.log('');
      break;
    }

    case 'run': {
      const slug = args[1];
      if (!slug) {
        console.error('Usage: sop run <slug> --kv key=val [--kv key=val ...]');
        process.exit(1);
      }

      await engine.init();
      const kv = getKVPairs();

      try {
        const result = await engine.run(slug, kv);
        console.log('✅ SOP flow started:', result);
      } catch (e) {
        console.error('❌', e.message);
        process.exit(1);
      }
      break;
    }

    case 'end': {
      const processName = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
      if (!processName) {
        console.error('Usage: sop end <process-name>');
        process.exit(1);
      }

      try {
        const result = await engine.end(processName, getFlag('--goal'));
        console.log('✅ Flow ended, SOP extruded:', result);
      } catch (e) {
        console.error('❌', e.message);
        process.exit(1);
      }
      break;
    }

    default: {
      console.log(`
  TWI SOP Engine — Manage extruded Standard Operating Procedures

  Usage: sop <command> [options]

  Commands:
    init                         Initialize SQLite database
    index [--dir path]           Scan and index SOPs from filesystem
    list [--domain X]            List all indexed SOPs
    search <query>               BM25 keyword search
    show <slug>                  Display full SOP details
    run <slug> --kv key=val      Start a new SOP flow
    end <process-name>           End an active flow (triggers extrusion)

  Environment:
    SOP_DB_PATH     SQLite database path
    SOP_DIR         SOPs directory path
    JOBWORLD_URL    Server URL (default: http://localhost:3847)
      `);
    }
  }

  engine.close();
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
