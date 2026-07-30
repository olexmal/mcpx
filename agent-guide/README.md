# mcpx Agent Guide pack

Teach shell-capable AI agents how to use the **`mcpx`** CLI (list Servers → list Tools → call Tool) without depending on IDE MCP allowlists.

## Prerequisite

Install **`mcpx`** and put it on your `PATH` before relying on this pack. See the [mcpx repository](https://github.com/olexmal/mcpx) README (`npm install && npm run build && npm link`, or your release install docs).

Quick check:

```bash
mcpx --help
```

## What’s in this zip

| Path | Role |
| :--- | :--- |
| `mcpx/AGENT_GUIDE.md` | **Agent Guide** — canonical, agent-agnostic instructions |
| `.cursor/rules/mcpx.mdc` | **Cursor Adapter** (`alwaysApply: true`) — points at the Guide |
| `AGENTS.mcpx.md` | **Adapter snippet** — append into your `AGENTS.md` (never overwrite blindly) |
| `README.md` | This file |

## Install into a project

From the project root (the repo your agent works in):

1. Copy `mcpx/AGENT_GUIDE.md` → `mcpx/AGENT_GUIDE.md`
2. Copy `.cursor/rules/mcpx.mdc` → `.cursor/rules/mcpx.mdc` (create `.cursor/rules/` if needed)
3. If you use `AGENTS.md`: **append** the contents of `AGENTS.mcpx.md` to your existing file. If you do not have `AGENTS.md`, you may rename/copy the snippet to `AGENTS.md` or keep the filename and reference it from your agent docs.

Do not commit secrets into Config; this pack does not include `~/.mcpx/mcp.json`.

## After install

Agents should follow `mcpx/AGENT_GUIDE.md`. Humans wanting the full CLI flag reference should open `docs/cli.md` in the mcpx repository.
