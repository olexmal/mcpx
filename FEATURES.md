# mcpx features

Shipped capabilities and hard product boundaries for `mcpx`. **Backlog priority lives in GitHub issues**, not in this file.

Shipped behavior detail: [`INCEPTION.md`](./INCEPTION.md), [`docs/cli.md`](./docs/cli.md), [`agent-guide/`](./agent-guide/).

---

## Shipped

- **Named Servers in Config** — `mcpServers` map with optional Purpose (`description`).
- **Server management** — `server list` / `add` (flags, `--from-file`, `--from-clipboard`) / `remove`.
- **Tool loop** — `list-tools` and `call-tool` with required `-s` / `--server`.
- **Transports** — stdio (`command` / `args` / `env`) and Streamable HTTP (`url` / `headers`).
- **Agent-first Output** — compact JSON on stdout; `--pretty` / TTY; errors on stderr with exit 1.
- **Config override** — `-c` / `--config <path>` (wins) or `MCPX_CONFIG` for disposable / test Config paths; leading `~` expanded; directory path rejected.
- **Project Config** — If `./.mcpx/mcp.json` exists in cwd, it replaces User Config (`~/.mcpx/mcp.json`) for reads and writes (no merge, no ancestor walk). Explicit override (`--config` / `MCPX_CONFIG`) still wins. Empty Config (`{}` / empty `mcpServers`) → empty Server list; blank/non-JSON file → invalid Config. See [`docs/adr/0002-project-config-replace.md`](./docs/adr/0002-project-config-replace.md).
- **Agent Guide pack** — redistributable Guide + Cursor / `AGENTS.md` Adapters; zip on GitHub Releases (`pack:agent-guide`).

---

## Backlog

Open work is tracked as GitHub issues:

- [Next (high priority)](https://github.com/olexmal/mcpx/issues?q=is%3Aissue+is%3Aopen+label%3Abacklog%3Anext) — label `backlog:next`, titles `[Next NN] …`
- [Later (wishlist)](https://github.com/olexmal/mcpx/issues?q=is%3Aissue+is%3Aopen+label%3Abacklog%3Alater) — label `backlog:later`, titles `[Later NN] …`

New product ideas → open or search an issue. Do not add Next/Later bullets here. Stubs start as `needs-triage`; do not mark `ready-for-agent` without a grilled spec.

When a feature ships: close its issue and add a bullet under **Shipped**.

---

## Won’t

Hard nos — do not schedule these as features.

1. **Act as an MCP server / gateway for Cursor** — `mcpx` stays a CLI clients run; it does not become something the IDE connects to as MCP.
2. **Edit or generate Cursor/IDE `mcp.json`** — Only `mcpx` Config (user, project, or `--config` / `MCPX_CONFIG`).
3. **Implicit Server when `-s` is omitted** — Tool commands always require an explicit Server name (no silent target).
