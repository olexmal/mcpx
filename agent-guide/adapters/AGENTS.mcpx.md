<!--
  mcpx Adapter snippet — append this block to your project's AGENTS.md.
  Do not replace an existing AGENTS.md wholesale.
-->

## mcpx (MCP via shell)

When MCP Tools are needed outside the IDE’s allowlisted MCP servers, use the **`mcpx`** CLI.

- Follow `mcpx/AGENT_GUIDE.md` in this repository.
- Prerequisite: `mcpx` on `PATH` (`mcpx --help`). If missing, ask the user to install it; do not edit IDE `mcp.json`.
- Loop: `mcpx server list` → `mcpx list-tools -s <name>` → `mcpx call-tool -s <name> --tool <tool> --args '<json>'`.
- Always pass `-s` / `--server` on Tool commands.
- Stdout is JSON; failures use stderr and exit code 1.
