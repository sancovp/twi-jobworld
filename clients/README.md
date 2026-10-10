# clients/

Per-client configuration for the fork-and-constrain tower. Each client is a `<name>/config.json`
(the ONE config — business + departments + agents + MCP choice + runtime). The base ships this
directory empty; a client fork/branch (e.g. `b6`) adds `clients/<name>/config.json`.

At deploy the entrypoint seeds an instance from a client config via `JOBWORLD_CLIENT=<name>`
(`docker/entrypoint-jobworld.sh`), then COMPILES it with `server/render.py`. **No secrets live here**
— API keys are provided at runtime (mounted file or env) and injected only into `.mcp.json`.

A client config is NOT a hand-hack: it is the same shape `config.example.json` documents, filled in
for that client. B6 = base + `clients/b6/config.json`.
