# Project Config replaces User Config (cwd only)

When `cwd/.mcpx/mcp.json` exists, it is the active Config for both reads and writes — full replace, no merge with `~/.mcpx/mcp.json`. Discovery is cwd-only (no ancestor walk). Explicit override (`MCPX_CONFIG`, later `--config`) still wins over Project Config so tests and scripts stay predictable. mcpx never creates the project path on `server add`; empty project files yield an empty Server list. Merge-on-clash stays a later option if replace-only proves too strict.

## Considered options

- Walk up from cwd to find `.mcpx/mcp.json` — rejected; surprises in monorepos and hides which tree owns Config
- Merge User + Project maps (project wins on name clash) — rejected for v1; softer but masks “why is this Server missing?”; deferred to FEATURES Later
- Project Config outranking `MCPX_CONFIG` — rejected; breaks disposable/test overrides when cwd happens to contain `.mcpx/`
- Auto-create Project Config on first `server add` — rejected; project files must be intentional (`init` or hand-create)
