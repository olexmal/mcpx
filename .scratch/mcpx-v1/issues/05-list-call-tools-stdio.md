# 05 — List and call Tools over stdio

**What to build:** Agents can run `mcpx list-tools --server <name>` and `mcpx call-tool --server <name> --tool <tool> --args '<json>'` against a stdio Server from Config. `--server` is required; each invocation connects, runs one operation, and disconnects. Errors for missing server flag, unknown Server, bad args JSON, connect failure, and Tool failure are clear and non-zero.

**Blocked by:** 02 — List configured Servers

**Status:** completed

- [x] `list-tools --server <name>` returns tool names, descriptions, and input schemas as JSON for a stdio Server
- [x] `call-tool --server <name> --tool <tool> --args '<json>'` returns the Tool result as JSON
- [x] Omitting `--server` / `-s` fails with non-zero exit (no default Server)
- [x] Unknown Server name, invalid `--args` JSON, connect failure, and Tool error each fail clearly
- [x] No one-off `--command` / `--url` bypass on these commands
- [x] CLI acceptance tests use a stub stdio MCP Server and a disposable Config
