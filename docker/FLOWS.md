# `docker/` — the BASE image flows (rule 22)

This dir IS the base image's source (`jobworld-cave:latest` builds from
`Dockerfile.jobworld`): the base boot, the template copy, the global sync.
**This is where the tmux-CEO architecture lives** — the version truth.

## Flow 1 — Base boot (`entrypoint-jobworld.sh`) — THE ORIGINAL DESIGN

```mermaid
sequenceDiagram
  participant E as entrypoint-jobworld.sh
  participant FS as instance dir
  participant T as tmux session
  participant CC as claude (INTERACTIVE Claude Code)
  participant S as python -m server (CAVE)
  E->>FS: mkdir event-stream/ sops/ skills/ .claude/{rules,skills}
  E->>FS: copy template: index.html · HEARTBEAT.md (if missing)
  E->>FS: copy /agent/skills/* → instance/.claude/skills/ (per-instance equip)
  E->>FS: write CEO CLAUDE.md (if missing) — THE DIR CODES THE CEO
  E->>FS: sync_globals.sh (global rules/skills → instance)
  E->>T: tmux new-session -s $JOBWORLD_TMUX
  E->>T: send-keys "cd $INSTANCE_DIR" Enter
  E->>CC: send-keys "claude --permission-mode bypassPermissions" Enter
  E->>CC: send-keys "/model claude-opus-4-6" Enter
  Note over CC: THE CEO = interactive Claude Code, a REAL Anthropic model,<br/>living in the pane. The client attaches → it IS his main claude code.
  E->>S: python -m server --dir $INSTANCE_DIR --tmux $SESSION (background)
  Note over S: base CAVE CodeAgent drives THE SAME pane via tmux send-keys —<br/>heartbeat + /input type INTO the interactive claude. Human + world share one thread.
  E->>E: wait $CAVE_PID (container lives while the server lives)
```

## Flow 2 — What the SDK overlay (`Dockerfile.sdk` + `entrypoint-sdk.sh`) changes

```mermaid
sequenceDiagram
  participant W as entrypoint-sdk.sh (overlay wrapper, root)
  participant B as entrypoint-jobworld.sh (base, as ceo)
  participant JA as JobworldAgent.__init__ (patched)
  W->>W: chown data dirs · start jwout serve + dashboard sidecars
  W->>B: su ceo → exec base entrypoint UNCHANGED
  B->>B: Flow 1 runs — INCLUDING the tmux claude launch
  B->>JA: python -m server ...
  JA->>JA: super() attaches tmux CodeAgent → then REPLACED by ClaudePMainAgent (SDK)
  Note over JA: the pane's interactive claude is ORPHANED in this mode —<br/>heartbeat//input drive the SDK session, not the pane.<br/>SDK = the dev/mock harness; the tmux pane = the production surface (rule 07).
```

## Files

| file | role |
|---|---|
| `Dockerfile.jobworld` | builds `jobworld-cave:latest` (CAVE + server + ink-ceo + template) |
| `entrypoint-jobworld.sh` | Flow 1 — the base boot |
| `sync_globals.sh` | global `/jobworld_data/.claude/` rules/skills → instance |
| `bake_jobworld.sh` | image bake helper |
| `requirements-jobworld.txt` | base python deps |
