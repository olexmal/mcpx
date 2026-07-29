# 03 — Add and remove Servers (flags)

**What to build:** Users can register and delete named Servers via `mcpx server add` (flags for name, Purpose, stdio and/or HTTP fields) and `mcpx server remove <name>`, creating `~/.mcpx/` when needed. Duplicates and unknown names fail clearly; invalid transport shape (neither stdio nor `url`, or both) is rejected.

**Blocked by:** 02 — List configured Servers

**Status:** completed

- [x] `mcpx server add` with flags persists a Server into Config and shows up in `server list`
- [x] First save creates `~/.mcpx/` (and `mcp.json`) if missing
- [x] Duplicate Server name is rejected (non-zero exit, no overwrite)
- [x] `mcpx server remove <name>` removes the Server; unknown name fails clearly
- [x] Server with neither stdio fields nor `url`, or with both, is rejected per the chosen rule (reject both)
- [x] CLI acceptance tests cover add, remove, duplicate, and invalid transport cases
