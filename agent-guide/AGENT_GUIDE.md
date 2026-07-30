# mcpx Agent Guide

Teach any shell-capable agent how to reach configured MCP **Servers** via the `mcpx` CLI — not by editing IDE MCP settings.

`mcpx` is **not** an MCP server. It runs Commands against named Servers in Config and prints JSON on stdout.

## Prerequisite

`mcpx` must be on `PATH`.

```bash
mcpx --help
```

If that fails, stop and tell the user to install `mcpx` from the project repository (`npm install && npm run build && npm link`, or their documented install path). Do not invent a substitute gateway or edit Cursor/IDE `mcp.json`.

## Agent loop (always)

Every Tool operation requires `-s` / `--server <name>`.

1. **List Servers** — choose by Purpose  
   `mcpx server list`
2. **List Tools** on that Server — read names, descriptions, `inputSchema`  
   `mcpx list-tools -s <name>`
3. **Call a Tool** — pass a JSON **object** as `--args`  
   `mcpx call-tool -s <name> --tool <tool> --args '<json>'`

Example:

```bash
mcpx server list
mcpx list-tools -s idea
mcpx call-tool -s idea --tool get_all_open_file_paths --args '{}'
```

Short form `-s` equals `--server`. Short form `-t` equals `--tool`.

## Output

| Stream | Meaning |
| :--- | :--- |
| stdout | Compact JSON by default (agent-first). Use `mcpx --pretty …` for indented JSON |
| stderr | Error message |
| exit 0 | Success |
| exit 1 | Failure (usage, Config, connect, or Tool error) |

Parse stdout JSON on success. On failure, read stderr; do not expect a JSON error body.

### Success shapes (essentials)

- `server list` → `[{ "name", "purpose" }, …]` (empty Config → `[]`)
- `list-tools` → `[{ "name", "description?", "inputSchema" }, …]`
- `call-tool` → MCP tool result object (often `{ "content": [ … ] }`)

## Config (do not confuse with IDE MCP config)

| Item | Value |
| :--- | :--- |
| Default path | `~/.mcpx/mcp.json` |
| Override | `MCPX_CONFIG` = path to an `mcp.json` |
| Shape | `{ "mcpServers": { "<name>": { … } } }` |
| Purpose | optional `description`; else fallback from name + command/url |

Exactly one transport per Server:

- **stdio:** `command`, optional `args`, `env`
- **Streamable HTTP:** `url`, optional `headers`

Not both. Not neither. Legacy **SSE** is out of scope — do not register `/sse` endpoints expecting v1 to work.

Hand-editing `~/.mcpx/mcp.json` is valid. **Never** edit Cursor/IDE `mcp.json` for mcpx.

### Registering Servers (when the user asks)

```bash
mcpx server add --name <name> --description "<Purpose>" --url <http-url>
mcpx server add --name <name> --command <cmd> --args '<json-array>'
mcpx server add --from-file snippet.json
mcpx server remove <name>
```

Prefer JetBrains **Copy HTTP Stream** (Streamable HTTP) over SSE config.

## Hard don'ts

- Do not call Tools without `-s` / `--server`
- Do not use one-off `--command` / `--url` on `list-tools` / `call-tool` (v1 has none)
- Do not treat `mcpx` as an MCP server to add to the IDE
- Do not use legacy SSE transport
- Do not dump every Tool across all Servers into one list — always scope to one Server

## When Servers overlap

Two Servers may expose similar Tools (e.g. IDE DB tools vs a dedicated DB MCP). Choose using **Purpose** from `server list`, then confirm with `list-tools`.

## Human reference

Full flag encyclopedia: repository `docs/cli.md` (not required for the loop above).
