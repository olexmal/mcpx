# mcpx CLI reference

`mcpx` is a shell CLI that connects to **named, configured MCP Servers** and exposes their **Tools**. It is not an MCP server, proxy, or IDE config editor.

Noun-first surface. Always pick a Server by name — there is no default.

## Install

```bash
npm install
npm run build
npm link          # puts `mcpx` on PATH
mcpx --help
```

Without linking:

```bash
node dist/cli.js --help
```

Requires Node.js ≥ 20.

## Agent loop

1. `mcpx server list` — choose a Server by **Purpose**
2. `mcpx list-tools -s <name>` — discover Tools and input schemas
3. `mcpx call-tool -s <name> --tool <tool> --args '<json>'` — invoke a Tool

Each Tool command opens a short-lived connection, runs the MCP operation, then disconnects.

## Synopsis

```text
mcpx [--pretty] <command>

mcpx server list
mcpx server add [options]
mcpx server remove <name>
mcpx list-tools --server <name>
mcpx call-tool --server <name> --tool <name> [--args <json>]
```

With no arguments, `mcpx` prints help and exits 0.

---

## Global options

| Option | Description |
| :--- | :--- |
| `--pretty` | Force indented JSON on stdout |
| `-h`, `--help` | Show help |

`--pretty` applies to commands that write JSON (`server list`, `list-tools`, `call-tool`). Place it before the subcommand:

```bash
mcpx --pretty server list
mcpx --pretty list-tools -s db
```

---

## Output and exit codes

| Channel | Behavior |
| :--- | :--- |
| **stdout (default)** | Compact JSON + trailing newline (agent-first) |
| **stdout (`--pretty`)** | Indented JSON (`JSON.stringify(..., null, 2)`) |
| **stdout (TTY)** | Pretty JSON even without `--pretty` when stdout is a terminal |
| **stderr** | Error message + trailing newline |
| **exit 0** | Success |
| **exit 1** | Any failure (usage, Config, connect, tool error) |

Successful mutating commands (`server add`, `server remove`) write nothing on success.

### Success JSON shapes

**`server list`**

```json
[{ "name": "db", "purpose": "Local database MCP" }]
```

**`list-tools`**

```json
[
  {
    "name": "query",
    "description": "Run SQL",
    "inputSchema": { "type": "object", "properties": { "sql": { "type": "string" } } }
  }
]
```

`description` is omitted when the Server does not provide one.

**`call-tool`**

MCP tool result object (typically `{ "content": [ … ] }`, may include `structuredContent` / `isError`). When the MCP result has `isError: true`, `mcpx` exits 1 and writes `Tool error: …` to stderr with empty stdout.

---

## Config

### Path

| Source | Path |
| :--- | :--- |
| Default | `~/.mcpx/mcp.json` (`$HOME/.mcpx/mcp.json`) |
| Override | `MCPX_CONFIG` — absolute or relative path to an `mcp.json` file |

When `MCPX_CONFIG` is set, `mcpx` never reads or writes the real home Config.

```bash
MCPX_CONFIG=/tmp/demo-mcp.json mcpx server list
```

Missing Config file ⇒ empty Server map (success for `server list`). Invalid JSON ⇒ error.

Hand-editing Config is valid. `mcpx` never edits Cursor/IDE `mcp.json`.

### Shape

Top-level object with an `mcpServers` map. The map key is the Server **name**. Optional `description` is the Server’s **Purpose**.

Exactly one transport per Server:

- **stdio:** `command` (required), optional `args` (string array), optional `env` (string map)
- **Streamable HTTP:** `url` (required), optional `headers` (string map)

Not both. Not neither. Transport is inferred from fields present — there is no `transport` / `type` enum in Config. Legacy SSE is out of scope for v1.

```json
{
  "mcpServers": {
    "db": {
      "description": "Local database MCP",
      "command": "npx",
      "args": ["-y", "@example/db-mcp"],
      "env": { "DB_URL": "postgres://localhost/app" }
    },
    "idea": {
      "description": "IntelliJ IDEA MCP",
      "url": "http://127.0.0.1:64342/stream",
      "headers": { "Authorization": "Bearer …" }
    }
  }
}
```

### Purpose fallback

If `description` is missing or empty:

| Transport | Fallback Purpose |
| :--- | :--- |
| stdio | `{name} (command: {command})` |
| HTTP | `{name} (url: {url})` |
| neither | `{name}` |

---

## Environment variables

| Variable | Role |
| :--- | :--- |
| `MCPX_CONFIG` | Path to Config file (overrides `~/.mcpx/mcp.json`) |
| `MCPX_CLIPBOARD` | Snippet text for `server add --from-clipboard` (skips real clipboard; for tests) |
| `HOME` | Used to resolve default Config under `~/.mcpx/` |

---

## Commands

### `mcpx server list`

List configured Servers and each Purpose. Does **not** open a live MCP connection.

```bash
mcpx server list
mcpx --pretty server list
```

**Stdout:** JSON array of `{ "name", "purpose" }`.  
**Empty Config:** `[]`.

---

### `mcpx server add`

Register one or more Servers in Config. Three modes (mutually exclusive styles):

1. **Flag-based** — `--name` plus stdio and/or HTTP fields  
2. **`--from-file <path>`** — merge a JSON snippet  
3. **`--from-clipboard`** — merge clipboard (or `MCPX_CLIPBOARD`)

Cannot combine `--from-file` with `--from-clipboard`.  
Cannot combine either merge mode with `--command` / `--url` / `--args` / `--env` / `--headers` / `--description`.

Duplicate names fail atomically (nothing written).

#### Flag options

| Option | Description |
| :--- | :--- |
| `--name <name>` | Server name (Config map key). **Required** for flag add and for single-body snippets |
| `--description <text>` | Purpose (optional) |
| `--command <cmd>` | Stdio executable |
| `--args <json>` | Stdio args as a JSON **array** string |
| `--env <json>` | Stdio env as a JSON **object** string |
| `--url <url>` | Streamable HTTP URL |
| `--headers <json>` | HTTP headers as a JSON **object** string |
| `--from-file <path>` | Merge Servers from a JSON snippet file |
| `--from-clipboard` | Merge Servers from the clipboard |

#### Flag examples

```bash
mcpx server add --name db --description "Local database MCP" \
  --command npx --args '["-y","@example/db-mcp"]' \
  --env '{"DB_URL":"postgres://localhost/app"}'

mcpx server add --name idea --description "IntelliJ IDEA MCP" \
  --url http://127.0.0.1:64342/stream \
  --headers '{"Authorization":"Bearer …"}'
```

#### Snippet merge examples

```bash
mcpx server add --from-file snippet.json
mcpx server add --from-clipboard
mcpx server add --name idea --from-file single-body.json
```

#### Accepted snippet shapes

1. **Full map** (JetBrains Copy HTTP Stream / Copy Stdio Config):

```json
{
  "mcpServers": {
    "idea": {
      "url": "http://127.0.0.1:64342/stream"
    }
  }
}
```

2. **Bare map** of named Servers:

```json
{
  "idea": {
    "url": "http://127.0.0.1:64342/stream"
  }
}
```

3. **Single Server body** (top-level `command` or `url`) — requires `--name`:

```json
{
  "url": "http://127.0.0.1:64342/stream"
}
```

```bash
mcpx server add --name idea --from-file single-body.json
```

JetBrains may include a `type` field (`streamable-http`, `sse`, …). Prefer Streamable HTTP URLs for v1. Extra fields may be stored as written; `mcpx` only requires a valid transport (`command` xor `url`).

#### Clipboard resolution

`--from-clipboard` reads, in order:

1. `MCPX_CLIPBOARD` if set  
2. `wl-paste --no-newline`  
3. `xclip -selection clipboard -o`  
4. `xsel --clipboard --output`  
5. `powershell.exe Get-Clipboard` (WSL → Windows clipboard)

If all fail ⇒ error.

---

### `mcpx server remove <name>`

Remove a Server from Config by name.

```bash
mcpx server remove db
```

Unknown name ⇒ stderr + exit 1. Success ⇒ no stdout.

---

### `mcpx list-tools`

List Tools on one configured Server (live MCP connection).

```bash
mcpx list-tools --server <name>
mcpx list-tools -s <name>
```

| Option | Required | Description |
| :--- | :--- | :--- |
| `-s`, `--server <name>` | yes | Server name in Config |

Unknown Server, invalid transport shape, or connect failure ⇒ stderr + exit 1.

There is no `--command` / `--url` bypass — register the Server first.

---

### `mcpx call-tool`

Call a Tool on one configured Server (live MCP connection).

```bash
mcpx call-tool --server <name> --tool <tool> --args '<json>'
mcpx call-tool -s <name> -t <tool> --args '{}'
```

| Option | Required | Description |
| :--- | :--- | :--- |
| `-s`, `--server <name>` | yes | Server name in Config |
| `-t`, `--tool <name>` | yes | Tool name |
| `--args <json>` | no | Tool arguments as a JSON **object** (default: `{}`) |

`--args` is validated before connect. Must be a JSON object (not an array or primitive). Invalid JSON or non-object ⇒ stderr + exit 1.

Tool-level MCP errors (`isError: true`) ⇒ `Tool error: …` on stderr, exit 1, empty stdout.

---

## Transports (v1)

| Transport | Config fields | Typical use |
| :--- | :--- | :--- |
| stdio | `command`, optional `args`, `env` | Local process MCP; JetBrains Copy Stdio Config |
| Streamable HTTP | `url`, optional `headers` | JetBrains Copy HTTP Stream Config |

**Out of scope:** legacy SSE (URLs ending in `/sse` or `type: "sse"`). Register Streamable HTTP endpoints (e.g. `/stream` or `/mcp` as advertised by the Server).

### HTTP reachability note (WSL + Windows IDE)

If the MCP Server (e.g. IntelliJ) listens on **Windows** `127.0.0.1`, a `mcpx` process inside **WSL** cannot reach it via `127.0.0.1` (that is the Linux VM loopback). Run `mcpx` on Windows against the same URL, enable WSL mirrored networking, or otherwise bridge host networking. Config itself does not fix this.

---

## Error catalogue (common)

| Situation | Typical stderr |
| :--- | :--- |
| Invalid Config JSON | `Invalid JSON in Config file: …` |
| Duplicate Server on add | `Server already exists (duplicate name): …` |
| Unknown Server | `Server not found (unknown name): …` |
| Neither / both transports | `Server must have either …` / `must not have both …` |
| Bad `--args` / `--env` / `--headers` JSON | `Invalid JSON for --…` or type mismatch |
| Merge + flag mix | `Cannot combine --from-file/--from-clipboard with …` |
| Both merge sources | `Use only one of --from-file or --from-clipboard` |
| Empty snippet | `Server snippet contains no Servers to add` |
| Clipboard unavailable | `Unable to read clipboard …` |
| Tool failure | `Tool error: …` |

---

## v1 limits

- No default Server — `list-tools` / `call-tool` always require `-s` / `--server`
- Tools only — no MCP resources or prompts
- No IDE `mcp.json` edits — only `~/.mcpx/mcp.json` or `MCPX_CONFIG`
- No one-off `--command` / `--url` on Tool commands
- stdio + Streamable HTTP only — legacy SSE out of scope
- No cross-server aggregated / namespaced tool lists

---

## Quick reference

```bash
# Servers
mcpx server list
mcpx server add --name db --command npx --args '["-y","@example/db-mcp"]'
mcpx server add --name idea --url http://127.0.0.1:64342/stream
mcpx server add --from-file snippet.json
mcpx server add --from-clipboard
mcpx server remove db

# Tools
mcpx list-tools -s idea
mcpx call-tool -s idea --tool get_all_open_file_paths --args '{}'
mcpx --pretty call-tool -s db --tool query --args '{"sql":"select 1"}'
```
