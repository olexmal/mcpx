# 02 — List configured Servers

**What to build:** `mcpx server list` reads Config (`mcpServers` in `~/.mcpx/mcp.json`), returns each Server name and Purpose (user `description`, or fallback from name + command/url), and never opens a live MCP connection. Missing or empty Config yields an empty list successfully; malformed Config fails clearly.

**Blocked by:** 01 — Scaffold CLI and acceptance-test harness

**Status:** ready-for-agent

- [ ] `mcpx server list` prints Servers from Config as JSON by default (name + Purpose)
- [ ] Purpose uses `description` when set; otherwise falls back to identifiable config details
- [ ] Missing or empty Config → empty list, exit 0
- [ ] Malformed Config JSON → non-zero exit and clear stderr
- [ ] Hand-edited Config is sufficient (no `server add` required yet)
- [ ] CLI acceptance test covers list + Purpose fallback + empty/malformed cases
