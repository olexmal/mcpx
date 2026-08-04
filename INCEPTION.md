# mcpx — Inception

## Problem

AI agents (Cursor and similar) often cannot use MCP servers that administration has not allowlisted in the IDE’s own MCP settings. They *can* run shell commands. Users still need those servers — for example IntelliJ IDEA’s built-in MCP ([JetBrains docs](https://www.jetbrains.com/help/idea/mcp-server.html)) and a separate local database MCP — without turning `mcpx` into a gateway the IDE connects to as MCP.

## Vision

**`mcpx`** is a CLI on `PATH` that connects to **named, configured MCP Servers** and exposes their **Tools** to agents (and humans) via shell:

1. `mcpx server list` — see configured Servers and each **Purpose**
2. `mcpx list-tools --server <name>` — discover Tools on one Server
3. `mcpx call-tool --server <name> …` — invoke a Tool

It is **not** an MCP server, proxy, or Cursor config injector. Domain language lives in [`CONTEXT.md`](./CONTEXT.md).

## Config

**Path (resolution order, replace not merge):** `MCPX_CONFIG` if set; else Project Config `./.mcpx/mcp.json` when that file exists in cwd; else User Config `~/.mcpx/mcp.json`.

**Shape:** same semantics as a normal MCP `mcpServers` map, plus optional user-authored Purpose (`description`). Tool commands require an explicit Server name. No one-off `--command` / `--url` on tool commands in v1.

```json
{
  "mcpServers": {
    "intellij": {
      "description": "IntelliJ IDEA MCP — IDE and project tools",
      "url": "http://127.0.0.1:PORT/mcp",
      "headers": {}
    },
    "local-db": {
      "description": "Oracle/Postgres query runner (dedicated DB MCP)",
      "command": "node",
      "args": ["/path/to/db-mcp/server.js"],
      "env": {}
    }
  }
}
```

| Entry field | Role |
| :--- | :--- |
| key under `mcpServers` | Server **name** (identity) |
| `description` | **Purpose** (optional; if omitted, fall back to name + command/url) |
| `command` / `args` / `env` | **stdio** transport |
| `url` / `headers` | **Streamable HTTP** transport |

Transport is implied by fields present (stdio vs HTTP), not a separate `transport` enum. Legacy **SSE** is out of scope for v1.

IntelliJ: paste **Copy HTTP Stream Config** or **Copy Stdio Config** from Settings → Tools → MCP Server into this file (or merge via CLI). Cursor/IDE `mcp.json` is never edited by `mcpx`.

## CLI

Noun-first surface:

### Server management

```bash
mcpx server list
mcpx server add --name local-db --description "…" --command node --args '["/path/to/server.js"]'
mcpx server add --from-file snippet.json          # or --from-clipboard: merge mcpServers snippet
mcpx server remove <name>
```

Hand-editing Config remains valid.

### Tools (Server required)

```bash
mcpx list-tools --server intellij
mcpx call-tool --server local-db --tool query --args '{"sql":"SELECT 1"}'
```

`--server` / `-s` is **required**. Missing or unknown name → stderr + non-zero exit.

### Output

- **Default:** JSON on stdout (agent-first)
- **Human:** `--pretty` and/or when stdout is a TTY
- **Errors:** stderr + non-zero exit

### Global flags (illustrative)

```bash
mcpx --pretty server list
mcpx list-tools -s intellij --pretty
```

## Agent loop

Typical Cursor/agent usage:

1. `mcpx server list` → choose Server by Purpose (e.g. IDE vs DB)
2. `mcpx list-tools --server <name>` → choose Tool + argument schema
3. `mcpx call-tool --server <name> --tool <tool> --args '<json>'`

Servers may overlap (IntelliJ database tools vs dedicated DB MCP). Purpose guides the choice; `mcpx` does not collapse them.

Each command opens a short-lived connection to that Server, runs the MCP operation, then disconnects.

## Transports (v1)

| Transport | Config | Example use |
| :--- | :--- | :--- |
| stdio | `command`, `args`, `env` | Local DB MCP; IntelliJ Copy Stdio Config |
| Streamable HTTP | `url`, optional `headers` | IntelliJ Copy HTTP Stream Config |

## v1 scope

**In**

- Multi-Server Config (User Config, optional Project Config, or `MCPX_CONFIG`)
- `server list|add|remove` (flags + paste/merge)
- `list-tools` / `call-tool` with mandatory `--server`
- Tools only
- stdio + Streamable HTTP
- JSON default output + pretty/TTY

**Out**

- Acting as an MCP server / gateway for Cursor
- One-off `--command` / `--url` bypassing Config
- Resources and prompts
- Legacy SSE
- Editing Cursor/IDE MCP config
- Cross-server aggregated / namespaced tool lists

## Implementation sketch

Suggested modules (language TBD):

| Module | Responsibility |
| :--- | :--- |
| `config` | Resolve/load/save active Config; resolve Server by name; merge snippets; Purpose fallback |
| `client` | Connect via stdio or Streamable HTTP; `listTools` / `callTool`; always close |
| `commands/server` | list / add / remove |
| `commands/tools` | `list-tools`, `call-tool` (require `--server`) |
| `output` | JSON vs pretty; stderr errors |

Use the official MCP client SDK for the chosen runtime. Prefer `command` + `args` array (do not shell-split a single command string).

## Next steps

1. Choose runtime/SDK and scaffold the CLI (`mcpx` on `PATH`).
2. Implement Config load/save + `server list|add|remove`.
3. Implement stdio + Streamable HTTP client + `list-tools` / `call-tool`.
4. Verify with IntelliJ MCP (HTTP Stream or stdio) and a local stdio DB MCP.
5. Document agent usage (three-command loop + example `mcp.json`).
