# mcpx

Shell CLI that lets agents (and humans) reach multiple configured MCP servers by
running commands — not by exposing itself as an MCP server.

Domain language: see [`CONTEXT.md`](./CONTEXT.md). Product intent: see [`INCEPTION.md`](./INCEPTION.md).

## Stack

| Choice | Value |
| :--- | :--- |
| Runtime | Node.js ≥ 20 (TypeScript) |
| Package | `mcpx` (this repo) |
| CLI parser | [commander](https://github.com/tj/commander.js) |
| MCP client SDK | [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) |
| Tests | [Vitest](https://vitest.dev/) against the `mcpx` process boundary |

## Install (development)

```bash
npm install
npm run build
npm link          # puts `mcpx` on your PATH
mcpx --help
```

Or run without linking:

```bash
node dist/cli.js --help
```

## Config

Default path: `~/.mcpx/mcp.json`

**Override for tests / disposable environments:** set `MCPX_CONFIG` to the full
path of an `mcp.json` file. When set, `mcpx` reads that file instead of
`~/.mcpx/mcp.json` and never touches the real home config.

```bash
MCPX_CONFIG=/tmp/demo-mcp.json mcpx server list
```

Top-level shape is a familiar `mcpServers` map. The map key is the Server name.
Optional `description` is the Server’s **Purpose** (shown by `server list`). If
`description` is omitted, Purpose falls back to identifiable details
(`name` + `command` or `url`). Exactly one transport per Server: stdio
(`command`, optional `args` / `env`) **or** Streamable HTTP (`url`, optional
`headers`) — not both, not neither.

```json
{
  "mcpServers": {
    "db": {
      "description": "Local database MCP",
      "command": "npx",
      "args": ["-y", "@example/db-mcp"],
      "env": { "DB_URL": "postgres://localhost/app" }
    },
    "intellij": {
      "description": "IntelliJ IDEA MCP",
      "url": "http://127.0.0.1:64342/mcp",
      "headers": { "Authorization": "Bearer …" }
    }
  }
}
```

Hand-editing `~/.mcpx/mcp.json` is valid. `mcpx` never edits Cursor/IDE
`mcp.json`.

## Agent loop

Agents and humans share the same three-step workflow. Always pick a Server by
name (`-s` / `--server` on Tool commands).

1. **List Servers** (and Purpose) — choose which Server to use
2. **List Tools** on that Server — learn names, descriptions, and input schemas
3. **Call a Tool** on that Server — pass JSON args

```bash
mcpx server list
mcpx list-tools -s db
mcpx call-tool -s db --tool query --args '{"sql":"select 1"}'
```

Equivalent long form: `--server` instead of `-s`.

## Adding Servers from JSON / clipboard

```bash
mcpx server add --from-file snippet.json
mcpx server add --from-clipboard
```

Snippet shapes accepted:

1. Full `{"mcpServers":{...}}` (JetBrains Copy HTTP Stream / Copy Stdio Config)
2. Bare map of named Servers `{ "name": { "command"|"url": ... } }`
3. Single Server body `{ "command"|"url": ... }` — requires `--name <name>`

Duplicate names fail atomically (nothing written). Each new Server must have
exactly one of `command` or `url`.

**Clipboard:** `--from-clipboard` reads the system clipboard (`wl-paste` /
`xclip` / `xsel`, or `powershell.exe Get-Clipboard` on WSL). For tests, set
`MCPX_CLIPBOARD` to the snippet text instead of touching the real clipboard.

Flag-based add (stdio or HTTP):

```bash
mcpx server add --name db --description "Local database MCP" \
  --command npx --args '["-y","@example/db-mcp"]'
mcpx server add --name intellij --description "IntelliJ IDEA MCP" \
  --url http://127.0.0.1:64342/mcp
```

## Output

- **Default:** compact JSON on stdout (agent-first)
- **`--pretty`:** force indented JSON
- **TTY:** when stdout is a terminal, prefer pretty JSON even without `--pretty`
- **Errors:** message on stderr, non-zero exit code

### Success JSON shapes

**`server list`** — array of `{ "name", "purpose" }` (`purpose` from `description` or fallback).

**`list-tools`** — array of `{ "name", "description?", "inputSchema" }`.

**`call-tool`** — MCP tool result object (typically `{ "content": [ … ] }`). Tool-level errors → non-zero exit and stderr, empty stdout.

## Commands (v1 surface)

```bash
mcpx server list
mcpx server add --name … --command … | --url …
mcpx server add --from-file <path>
mcpx server add --from-clipboard
mcpx server remove <name>
mcpx list-tools --server <name>
mcpx call-tool --server <name> --tool <tool> --args '<json>'
```

## v1 limits

- **Server required** — `list-tools` and `call-tool` always require `-s` / `--server`
- **Tools only** — no MCP resources or prompts
- **No IDE mcp.json edits** — Config is only `~/.mcpx/mcp.json` (or `MCPX_CONFIG`)
- **No one-off transport** — no `--command` / `--url` on `list-tools` / `call-tool`; register the Server in Config first
- **Transports:** stdio and Streamable HTTP only (legacy SSE out of scope)

## Development

```bash
npm run typecheck
npm test
```

Acceptance tests invoke the built `dist/cli.js` as a black box (exit code,
stdout, stderr) with `MCPX_CONFIG` pointing at a temp file.

## Agent Guide pack

Redistributable instructions for AI agents (Agent Guide + Cursor / `AGENTS.md`
Adapters) live in [`agent-guide/`](./agent-guide/). Build the GitHub Release zip:

```bash
npm run pack:agent-guide
# → dist-agent-guide/mcpx-agent-guide-<version>.zip
```

Pushing a `v*` tag runs CI that packs and uploads the zip to the Release.
See [`docs/adr/0001-agent-guide-pack.md`](./docs/adr/0001-agent-guide-pack.md).
