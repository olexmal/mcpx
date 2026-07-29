# 01 — Scaffold CLI and acceptance-test harness

**What to build:** A runnable `mcpx` CLI (local/dev install on `PATH`) with a disposable Config path for tests, shared Output rules (JSON by default, `--pretty` / TTY, errors on stderr with non-zero exit), and `--help` (or equivalent). The CLI acceptance-test seam exists even if feature commands are still stubs. Choose runtime and official MCP client SDK as part of this work.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `mcpx` can be invoked as a CLI for development (on `PATH` or documented equivalent)
- [ ] Tests can point Config at a temp location (home or path override) without touching the real `~/.mcpx/mcp.json`
- [ ] Output conventions are implemented: JSON default, pretty via `--pretty` and/or TTY, failures → stderr + non-zero exit
- [ ] `--help` (or equivalent) documents the intended command surface
- [ ] Runtime and MCP SDK choice is recorded (e.g. brief note in README or package metadata)
