# mcpx features

Ordered product map for `mcpx`. **Next** is strict priority (top = build first). **Later** is a looser wishlist. **Won’t** are product boundaries, not low-priority backlog.

Shipped behavior: see [`INCEPTION.md`](./INCEPTION.md), [`docs/cli.md`](./docs/cli.md), [`agent-guide/`](./agent-guide/).

---

## Shipped

- **Named Servers in Config** — `mcpServers` map with optional Purpose (`description`).
- **Server management** — `server list` / `add` (flags, `--from-file`, `--from-clipboard`) / `remove`.
- **Tool loop** — `list-tools` and `call-tool` with required `-s` / `--server`.
- **Transports** — stdio (`command` / `args` / `env`) and Streamable HTTP (`url` / `headers`).
- **Agent-first Output** — compact JSON on stdout; `--pretty` / TTY; errors on stderr with exit 1.
- **Config override** — `MCPX_CONFIG` for disposable / test Config paths.
- **Project Config** — If `./.mcpx/mcp.json` exists in cwd, it replaces User Config (`~/.mcpx/mcp.json`) for reads and writes (no merge, no ancestor walk). `MCPX_CONFIG` still wins. Empty Config (`{}` / empty `mcpServers`) → empty Server list; blank/non-JSON file → invalid Config. See [`docs/adr/0002-project-config-replace.md`](./docs/adr/0002-project-config-replace.md).
- **Agent Guide pack** — redistributable Guide + Cursor / `AGENTS.md` Adapters; zip on GitHub Releases (`pack:agent-guide`).

---

## Next

Highest priority first.

1. **Publish `mcpx` on npm** — Install globally with npm without cloning and `npm link`.
2. **`--config <path>` flag** — Per-invocation Config path for scripts and CI without relying on env alone.
3. **`mcpx doctor`** — Validate Config shape and probe connect to each Server (surface bad URLs, SSE vs Streamable HTTP, unreachable localhost).
4. **`server update` / edit** — Change Purpose, url, headers, command/args/env without remove+add.
5. **Validate `--args` against `inputSchema`** — Fail fast before connect when Tool arguments don’t match the schema from `list-tools`.
6. **`call-tool` args from stdin or file** — Pass large / nested JSON without shell-escaping pain (`--args-file` / stdin).
7. **Auth helper for HTTP headers** — Resolve bearer (or other) tokens from env or a file into `headers` without storing secrets in Config.
8. **`mcpx init`** — Scaffold project `.mcpx/mcp.json` and optionally drop the Agent Guide pack files into the repo.
9. **Structured exit codes** — Distinct non-zero codes for usage vs Config vs connect vs Tool error so agents can branch reliably.
10. **Shell completions** — Complete Server names (and Tool names after `-s` where practical).
11. **MCP resources** — `list-resources` / `read-resource` scoped with `-s` / `--server`.
12. **MCP prompts** — List/get prompts scoped with `-s` / `--server`.
13. **Legacy SSE transport** — Connect to IntelliJ-style `/sse` endpoints users still copy from the IDE.
14. **Prebuilt CLI binaries on Releases** — Multi-OS binaries alongside the Agent Guide zip.
15. **One-off `--url` / `--command` on Tool commands** — Ad-hoc Server without writing Config (escape hatch).
16. **Cross-server Tool discovery** — Aggregate or namespaced `list-tools` across all configured Servers.

---

## Later

Rough order; not a commitment.

1. **`server export` / copy** — Emit one Server as JetBrains-shaped JSON for sharing or re-import.
2. **Retry / timeout flags** — Tune flaky HTTP when the IDE MCP is restarting.
3. **Bundled tools+schemas dump** — One shot export of all Tools and `inputSchema`s for agent caching.
4. **Dry-run `call-tool`** — Show resolved Server and args without invoking.
5. **Windows package managers** — winget / Scoop (or solid Windows install docs) beside npm.
6. **Merge user + project Config** — Combine maps with project winning on name clash (only if replace-only proves too strict).
7. **Capability watch / notify** — Re-discover Tools when a Server’s capabilities change (niche).
8. **Interactive TUI** — Prompt-driven add/list for humans (flags and paste remain primary).
9. **Remote / multi-user Config sync** — Share Server maps across machines (out of personal CLI scope today).

---

## Won’t

Hard nos — do not schedule these as features.

1. **Act as an MCP server / gateway for Cursor** — `mcpx` stays a CLI clients run; it does not become something the IDE connects to as MCP.
2. **Edit or generate Cursor/IDE `mcp.json`** — Only `mcpx` Config (user, project, or `--config` / `MCPX_CONFIG`).
3. **Implicit Server when `-s` is omitted** — Tool commands always require an explicit Server name (no silent target).
