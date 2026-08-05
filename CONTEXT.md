# mcpx

Shell CLI that lets agents (and humans) reach multiple configured MCP servers by running commands — not by exposing itself as an MCP server.

## Language

**Server**:
A named, configured MCP endpoint the user can connect to via the CLI. Identity is its name in configuration. Distinct Servers may overlap in capability (e.g. IntelliJ MCP database tools vs a dedicated DB MCP); which to use is the agent's choice guided by Purpose. Every tool list/call targets a Server already in Config — no one-off `--command`/`--url` bypass in v1.
_Avoid_: Session, connection, ad-hoc flags-as-server, gateway, assuming one Server per concern

**Purpose**:
A short human/agent-facing explanation of what a Server is for (e.g. IntelliJ IDE vs local database access). Authored by the user as free text on the Server config; if omitted, fall back to identifiable config details (name + command/url). Shown when listing Servers; not a substitute for listing tools.
_Avoid_: Capabilities dump, tool list, description-as-live-probe

**Tool**:
An MCP tool exposed by a Server. Discovered and invoked only in the scope of one chosen Server. Listing or calling Tools always requires an explicit Server name. v1 exposes only Tools (not resources or prompts).
_Avoid_: Cross-server aggregate tool, global tool name, omitting `--server`, resources/prompts in v1

**Config**:
The active `mcp.json` mcpx reads and writes after resolution. Same semantics as a normal MCP `mcpServers` map, with an optional user-authored Purpose (`description`) per Server. Servers are added by pasting/merging a JSON snippet (e.g. IntelliJ Copy HTTP Stream/Stdio Config) or via flag-based `mcpx server add`; removed with `mcpx server remove`. Hand-editing remains valid. Explicit override wins: `--config` if set, else `MCPX_CONFIG` if set; else Project Config if that file exists; else User Config. Replace only — never merge maps.
_Avoid_: Editing Cursor/IDE mcp.json, `config.json` as the filename, paste-only or flags-only as the sole path, merging User and Project maps

**User Config**:
The per-user default Config at `~/.mcpx/mcp.json`. Used when no explicit override is set and no Project Config file exists in the current working directory.
_Avoid_: Calling this the only Config; IDE mcp.json

**Project Config**:
The per-working-directory Config at `./.mcpx/mcp.json` (cwd only, no ancestor walk). When that file exists, it fully replaces User Config for reads and writes. mcpx does not create this path on `server add` — only when the file already exists, or via a later scaffold command.
_Avoid_: Walking up to a git root; merging with User Config; auto-creating on first add; treating a blank/non-JSON file as Empty Config

**Empty Config**:
A valid Config whose `mcpServers` map is missing or `{}`, so the Server list is empty. Distinct from a missing Config file and from invalid JSON (including a zero-byte file), which fail rather than counting as Empty Config.
_Avoid_: Blank files, whitespace-only files, fallthrough to User Config when a present Project Config file is unreadable

**Output**:
Command results are JSON on stdout by default (agent-first). A human-readable mode is available via `--pretty` and/or when stdout is a TTY. Errors go to stderr with a non-zero exit code.
_Avoid_: Human text as the only format, requiring `--json` for agents

**Commands**:
Noun-first CLI: `mcpx server list|add|remove`, `mcpx list-tools --server <name>`, `mcpx call-tool --server <name> …`, plus top-level `mcpx doctor` (Config shape + Probe diagnostic). Agent loop is still list Servers → list Tools on one Server → call Tool; doctor is optional when Config or connect looks wrong.
_Avoid_: Verb-first `list servers` / `call tool` as the canonical surface; Doctor as a domain noun

**Transport**:
How a Server is reached. v1 supports stdio (`command` / `args` / `env`) and Streamable HTTP (`url`, optional headers). Legacy SSE is out of scope for v1.
_Avoid_: SSE-only clients as a v1 requirement

**Probe**:
A short-lived check that a Server’s Config entry can complete an MCP initialize over its Transport, then disconnect. Used by `mcpx doctor` after static shape validation; not Tool discovery or invocation.
_Avoid_: Health check, ping, connect-only without MCP, list-tools-as-check, Doctor-as-domain-noun

**Agent Guide**:
Portable instructions that teach a shell-capable agent how to use `mcpx`: the three-step loop (list Servers → list Tools on one Server → call Tool), Output conventions, and Config boundaries. Canonical form is agent-agnostic Markdown. Distinct from the full human CLI reference and from Config itself.
_Avoid_: “Rules” as the glossary name; Cursor/IDE-only formats as the only form; substituting for Config; editing Cursor/IDE mcp.json

**Adapter**:
A thin, tool-specific wrapper (e.g. Cursor rule file, `AGENTS.md` snippet) that points an agent at the Agent Guide. Not a second source of truth for the agent loop.
_Avoid_: Duplicating the full Agent Guide or CLI reference inside each Adapter
