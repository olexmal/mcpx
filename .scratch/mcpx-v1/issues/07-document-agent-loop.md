# 07 — Document the agent loop

**What to build:** Short documentation so agents and humans share the same workflow: example Config (stdio + HTTP), then `server list` → `list-tools --server` → `call-tool --server`, with Purpose guiding Server choice.

**Blocked by:** 06 — List and call Tools over Streamable HTTP

**Status:** completed

- [x] README (or equivalent) documents Config path/shape and Purpose
- [x] Documents the three-step agent loop with example commands
- [x] Includes example entries for both stdio and Streamable HTTP Servers
- [x] States v1 limits relevant to users (no default Server, Tools only, no IDE mcp.json edits)
