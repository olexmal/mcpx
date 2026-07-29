# 03 — Add and remove Servers (flags)

**What to build:** Users can register and delete named Servers via `mcpx server add` (flags for name, Purpose, stdio and/or HTTP fields) and `mcpx server remove <name>`, creating `~/.mcpx/` when needed. Duplicates and unknown names fail clearly; invalid transport shape (neither stdio nor `url`, or both) is rejected.

**Blocked by:** 02 — List configured Servers

**Status:** ready-for-agent

- [ ] `mcpx server add` with flags persists a Server into Config and shows up in `server list`
- [ ] First save creates `~/.mcpx/` (and `mcp.json`) if missing
- [ ] Duplicate Server name is rejected (non-zero exit, no overwrite)
- [ ] `mcpx server remove <name>` removes the Server; unknown name fails clearly
- [ ] Server with neither stdio fields nor `url`, or with both, is rejected per the chosen rule (reject both)
- [ ] CLI acceptance tests cover add, remove, duplicate, and invalid transport cases
