# Agent Guide pack as destination-shaped GitHub Release zip

We ship agent teaching material separately from the CLI binary: a zip of an Agent Guide plus thin Adapters, built by `npm run pack:agent-guide` and uploaded on `v*` tags. The zip mirrors project install paths (`mcpx/AGENT_GUIDE.md`, `.cursor/rules/mcpx.mdc`, `AGENTS.mcpx.md`) so users merge into a repo without reshuffling; we avoid overwriting an existing `AGENTS.md` by shipping a snippet instead. Cursor’s Adapter uses `alwaysApply: true` so agents learn the mcpx loop without being asked. Full CLI reference stays in `docs/cli.md` and is not in the zip.

## Considered options

- Guide-only stub linking to GitHub docs — rejected; zip must work offline after download
- Shipping full `docs/cli.md` or the CLI binary in the same zip — rejected; keeps the pack focused on agent instructions
- Overwriting root `AGENTS.md` — rejected; too destructive for real projects
