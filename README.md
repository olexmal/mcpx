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

## Output

- **Default:** compact JSON on stdout (agent-first)
- **`--pretty`:** force indented JSON
- **TTY:** when stdout is a terminal, prefer pretty JSON even without `--pretty`
- **Errors:** message on stderr, non-zero exit code

## Commands (v1 surface)

```bash
mcpx server list
mcpx server add …
mcpx server remove <name>
mcpx list-tools --server <name>
mcpx call-tool --server <name> --tool <tool> --args '<json>'
```

Ticket 01 scaffolds the harness; feature commands beyond a minimal
`server list` (empty / name-only) arrive in later tickets.

## Development

```bash
npm run typecheck
npm test
```

Acceptance tests invoke the built `dist/cli.js` as a black box (exit code,
stdout, stderr) with `MCPX_CONFIG` pointing at a temp file.
