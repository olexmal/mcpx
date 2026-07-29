# 04 — Merge Servers from file and clipboard

**What to build:** Users can merge JetBrains-style / normal `mcpServers` JSON snippets into Config with `mcpx server add --from-file` and `--from-clipboard`, without hand-editing, still rejecting duplicate names.

**Blocked by:** 03 — Add and remove Servers (flags)

**Status:** ready-for-agent

- [ ] `--from-file` merges a snippet into Config; new Servers appear in `server list`
- [ ] `--from-clipboard` merges a snippet from the clipboard the same way
- [ ] Duplicate names in the merge are rejected without partial silent overwrite (or documented atomic failure)
- [ ] Snippet shapes compatible with IntelliJ Copy HTTP Stream / Copy Stdio Config (and plain `mcpServers` maps) are accepted
- [ ] CLI acceptance tests cover file merge (clipboard may be mocked or skipped where the environment has no clipboard)
