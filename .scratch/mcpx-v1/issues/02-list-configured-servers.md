# 02 — List configured Servers

**What to build:** `mcpx server list` reads Config (`mcpServers` in `~/.mcpx/mcp.json`), returns each Server name and Purpose (user `description`, or fallback from name + command/url), and never opens a live MCP connection. Missing or empty Config yields an empty list successfully; malformed Config fails clearly.

**Blocked by:** 01 — Scaffold CLI and acceptance-test harness

**Status:** completed

- [x] `mcpx server list` prints Servers from Config as JSON by default (name + Purpose)
- [x] Purpose uses `description` when set; otherwise falls back to identifiable config details
- [x] Missing or empty Config → empty list, exit 0
- [x] Malformed Config JSON → non-zero exit and clear stderr
- [x] Hand-edited Config is sufficient (no `server add` required yet)
- [x] CLI acceptance test covers list + Purpose fallback + empty/malformed cases
