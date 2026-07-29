# 07 — Document the agent loop

**What to build:** Short documentation so agents and humans share the same workflow: example Config (stdio + HTTP), then `server list` → `list-tools --server` → `call-tool --server`, with Purpose guiding Server choice.

**Blocked by:** 06 — List and call Tools over Streamable HTTP

**Status:** ready-for-agent

- [ ] README (or equivalent) documents Config path/shape and Purpose
- [ ] Documents the three-step agent loop with example commands
- [ ] Includes example entries for both stdio and Streamable HTTP Servers
- [ ] States v1 limits relevant to users (no default Server, Tools only, no IDE mcp.json edits)
