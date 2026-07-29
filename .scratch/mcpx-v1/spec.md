# mcpx v1 — CLI for agent access to configured MCP Servers

Status: ready-for-agent

## Problem Statement

AI agents such as Cursor are often blocked from using MCP Servers that administration has not allowlisted in the IDE’s own MCP settings. Those agents can still run shell commands. Users need a way for agents to reach useful Servers (for example IntelliJ IDEA’s built-in MCP and a separate local database MCP) without installing a gateway that Cursor connects to as an MCP server, and without rewriting the IDE’s managed MCP configuration.

## Solution

Ship **`mcpx`**, a CLI on `PATH` that reads named Servers from `~/.mcpx/mcp.json` and lets agents (and humans) list Servers with Purpose, list Tools on one chosen Server, and call Tools — all via shell. Output is JSON by default so agents can parse it; a pretty/TTY mode exists for humans. v1 supports stdio and Streamable HTTP only, Tools only, and always requires an explicit Server name (no default, no one-off transport flags).

## User Stories

1. As an agent operator, I want `mcpx` available on my `PATH`, so that agents can invoke it without a custom absolute path.
2. As a user, I want my Servers stored in `~/.mcpx/mcp.json`, so that configuration is separate from Cursor/IDE MCP settings.
3. As a user, I want Config to use the familiar `mcpServers` map shape, so that I can reuse snippets from other MCP clients with minimal editing.
4. As a user, I want an optional `description` on each Server, so that agents can tell what each Server is for (Purpose) before listing Tools.
5. As a user, I want Purpose to fall back to identifiable config details when `description` is omitted, so that `server list` is still useful without mandatory prose.
6. As a user, I want to hand-edit `~/.mcpx/mcp.json`, so that I can paste JetBrains Copy HTTP Stream / Copy Stdio Config directly.
7. As a user, I want `mcpx server add` with flags (`--name`, `--description`, `--command`, `--args`, `--env`, `--url`, `--headers`), so that I can register a stdio or HTTP Server without opening an editor.
8. As a user, I want `mcpx server add --from-file`, so that I can merge a saved `mcpServers` snippet into Config.
9. As a user, I want `mcpx server add --from-clipboard`, so that I can paste an IDE-copied snippet in one step.
10. As a user, I want `mcpx server add` to reject duplicate Server names, so that I do not silently overwrite an existing entry.
11. As a user, I want `mcpx server remove <name>`, so that I can drop a Server I no longer use.
12. As a user, I want removing an unknown Server to fail clearly, so that typos are obvious.
13. As an agent, I want `mcpx server list` to return configured Servers and their Purpose as JSON, so that I can choose the right Server.
14. As a human, I want `mcpx server list --pretty` (or TTY auto-pretty), so that I can read the Server catalog easily.
15. As an agent, I want `server list` to work when Config is missing or empty (empty list, success), so that I know there is nothing configured yet.
16. As an agent, I want `mcpx list-tools --server <name>` to require `--server` / `-s`, so that I never hit an implicit Server.
17. As an agent, I want `list-tools` without `--server` to fail with a non-zero exit and stderr message, so that I correct the invocation.
18. As an agent, I want `list-tools` with an unknown Server name to fail clearly, so that I re-check `server list`.
19. As an agent, I want `list-tools` JSON to include tool names, descriptions, and input schemas, so that I can form valid `call-tool` arguments.
20. As an agent, I want `mcpx call-tool --server <name> --tool <tool> --args '<json>'`, so that I can invoke a Tool on a specific Server.
21. As an agent, I want `call-tool` without `--server` to fail, so that Tool calls are always scoped.
22. As an agent, I want invalid `--args` JSON to fail before connecting, so that I get a fast, clear error.
23. As an agent, I want a successful `call-tool` to print the Tool result as JSON on stdout, so that I can use the result in the next step.
24. As an agent, I want Tool failures from the MCP Server to surface as a non-zero exit with useful stderr or structured error JSON, so that I can recover or report.
25. As a user, I want stdio Servers (`command`, `args`, `env`) to work, so that local process MCP Servers (e.g. a DB MCP) are reachable.
26. As a user, I want Streamable HTTP Servers (`url`, optional `headers`) to work, so that IntelliJ’s HTTP Stream Config is reachable while the IDE is running.
27. As a user, I want transport to be inferred from Config fields (stdio vs HTTP), so that I do not maintain a separate `transport` enum.
28. As a user with both IntelliJ MCP and a dedicated DB MCP configured, I want both to appear in `server list` with distinct Purposes, so that an agent can pick IDE vs database access.
29. As a user, I want overlapping capabilities across Servers to remain separate entries, so that `mcpx` does not collapse or namespace Tools globally.
30. As an agent, I want each command to open a short-lived connection, run one operation, and disconnect, so that CLI usage stays simple and process lifetimes stay bounded.
31. As a user, I want the first `server add` (or save) to create `~/.mcpx/` if needed, so that setup does not require manual mkdir.
32. As a user, I want malformed Config JSON to fail with a clear error on any command that reads Config, so that I can fix the file.
33. As a user, I want a Server entry that has neither stdio fields nor `url` to be rejected or reported as invalid, so that I do not get a vague connect failure later.
34. As a user, I want a Server with both stdio and `url` fields to have a defined rule (reject or prefer one), so that behavior is predictable.
35. As an agent, I want JSON on stdout by default even when not a TTY, so that piping and agent capture stay reliable.
36. As a human, I want `--pretty` to force human-readable output, so that I can format JSON in any environment.
37. As a human, I want TTY stdout to prefer pretty output without `--pretty`, so that interactive use is readable by default.
38. As a user, I want `--json` not to be required for agents, so that the default path stays agent-first.
39. As a developer, I want `mcpx` not to edit Cursor/IDE `mcp.json`, so that admin-managed IDE config stays untouched.
40. As a developer, I want no default Server concept in Config or CLI, so that multi-Server setups cannot silently target the wrong Server.
41. As a developer, I want no `--command` / `--url` bypass on `list-tools` / `call-tool` in v1, so that all Tool access goes through named Config entries.
42. As a developer, I want resources and prompts out of the CLI surface in v1, so that scope stays Tools-only.
43. As a developer, I want legacy SSE out of v1, so that HTTP support means Streamable HTTP only.
44. As a user, I want `command` and `args` as separate fields (args as an array), so that paths with spaces and multi-arg launches work without shell-splitting bugs.
45. As an agent, I want stable, documented JSON shapes for `server list`, `list-tools`, and `call-tool` success payloads, so that parsing does not depend on pretty text.
46. As a user, I want env from a stdio Server Config merged over the process environment when spawning, so that Server-specific secrets/config apply.
47. As a user, I want optional headers on HTTP Servers, so that authenticated local endpoints can be used when needed.
48. As an operator, I want non-zero exit codes on all failure classes (usage, config, connect, tool error), so that scripts and agents can branch on success.
49. As a user, I want `server list` not to connect to live Servers or probe Tools, so that listing stays fast and works offline.
50. As a documentation reader, I want the agent loop (list Servers → list Tools → call Tool) documented, so that agents and humans share the same workflow.

## Implementation Decisions

- Build a greenfield CLI named `mcpx`, installable so the binary is on `PATH`.
- Domain vocabulary follows `CONTEXT.md` (Server, Purpose, Tool, Config, Output, Commands, Transport).
- Config path is `~/.mcpx/mcp.json` with top-level `mcpServers` object; Server name is the map key; optional `description` is Purpose.
- No `default` field; no one-off transport overrides on Tool commands.
- CLI surface is noun-first: `server list|add|remove`, `list-tools`, `call-tool`.
- `list-tools` and `call-tool` require `--server` / `-s`.
- `server add` supports flag-based registration and merge from file/clipboard snippets shaped like `mcpServers` (or a single server entry that can be merged under a name).
- Logical modules: Config (load/save/resolve/merge/Purpose fallback), MCP client (stdio + Streamable HTTP, listTools/callTool, always disconnect), server commands, tool commands, output (JSON vs pretty/TTY, stderr errors).
- Use an official MCP client SDK for the chosen runtime; prefer `command` + `args` array over splitting a single command string.
- Transport inference: presence of `url` ⇒ Streamable HTTP; presence of `command` ⇒ stdio. Define and enforce a single rule if both appear (recommended: reject as invalid Config for that Server).
- Each CLI invocation performs at most one connect → operate → disconnect cycle for Tool commands.
- Output: JSON to stdout by default; pretty when `--pretty` or stdout is a TTY; errors to stderr with non-zero exit.
- Runtime/language choice is left to the implementing agent but must support packaging a `PATH`-friendly CLI and both transports above.
- Do not implement an MCP server/gateway mode; do not write to Cursor/IDE MCP config files.

Config shape (decision artifact from inception):

```json
{
  "mcpServers": {
    "<name>": {
      "description": "<optional Purpose>",
      "command": "<stdio>",
      "args": ["..."],
      "env": {},
      "url": "<http>",
      "headers": {}
    }
  }
}
```

## Testing Decisions

- Good tests assert **external behavior** only: argv → exit code, stdout, stderr. They do not assert internal module structure, private helpers, or SDK call sequences.
- **Single seam:** the CLI process boundary. Invoke `mcpx` with a disposable Config location (temp home or config-path override) and stub MCP Servers (stdio fixture process and/or Streamable HTTP test server).
- Cover at least: empty/missing Config; add via flags; add via merge snippet; list with Purpose and fallback; remove; reject duplicate name; `list-tools` / `call-tool` success for stdio and HTTP; missing `--server`; unknown Server; invalid args JSON; connect failure; pretty vs JSON default.
- Prior art: none in-repo (greenfield). Establish this CLI seam as the acceptance test suite for v1.

## Out of Scope

- Acting as an MCP server, proxy, or gateway that Cursor connects to
- Editing or generating Cursor/IDE `mcp.json`
- Default Server
- One-off `--command` / `--url` on `list-tools` / `call-tool`
- MCP resources and prompts
- Legacy SSE transport
- Cross-server aggregated or namespaced Tool lists
- Interactive TUI beyond optional prompts if any; primary add paths are flags and paste/merge
- Multi-user or remote Config sync
- Packaging/distribution channels beyond making a local `PATH` binary work for development and personal use (unless trivial for the chosen toolchain)

## Further Notes

- Primary motivating Servers: IntelliJ IDEA MCP (Copy HTTP Stream or Copy Stdio Config) and a dedicated local DB MCP; both may coexist.
- IntelliJ must be running (MCP enabled) for HTTP Stream access; stdio Config from JetBrains may differ — both should work if present in Config.
- `INCEPTION.md` and `CONTEXT.md` are the product/domain sources of truth for this spec; if they diverge later, update the glossary before changing behavior.
- Issue tracker for this repo was not yet configured under `docs/agents/`; this spec is published via the local-markdown convention.
