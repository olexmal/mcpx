/**
 * Config path resolution.
 *
 * Override: set `MCPX_CONFIG` to an absolute or relative path to the mcp.json
 * file. Tests and disposable environments should use this so the real
 * `~/.mcpx/mcp.json` is never touched.
 *
 * Default: `~/.mcpx/mcp.json` (or `$HOME/.mcpx/mcp.json`).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.MCPX_CONFIG && env.MCPX_CONFIG.length > 0) {
    return path.resolve(env.MCPX_CONFIG);
  }
  const home = env.HOME ?? os.homedir();
  return path.join(home, ".mcpx", "mcp.json");
}

export type ServerConfig = {
  description?: unknown;
  command?: unknown;
  args?: unknown;
  env?: unknown;
  url?: unknown;
  headers?: unknown;
};

/** Load mcpServers from Config. Missing file ⇒ empty map (success). */
export function loadServers(
  configPath: string = resolveConfigPath(),
): Record<string, ServerConfig> {
  if (!fs.existsSync(configPath)) {
    return {};
  }
  const raw = fs.readFileSync(configPath, "utf8");
  let parsed: { mcpServers?: Record<string, ServerConfig> };
  try {
    parsed = JSON.parse(raw) as { mcpServers?: Record<string, ServerConfig> };
  } catch {
    throw new Error(`Invalid JSON in Config file: ${configPath}`);
  }
  return parsed.mcpServers ?? {};
}

/**
 * Purpose for a Server: user `description` when set, otherwise identifiable
 * config details (name + command/url). Never probes a live MCP connection.
 */
export function resolvePurpose(name: string, entry: ServerConfig): string {
  if (typeof entry.description === "string" && entry.description.length > 0) {
    return entry.description;
  }
  if (typeof entry.command === "string" && entry.command.length > 0) {
    return `${name} (command: ${entry.command})`;
  }
  if (typeof entry.url === "string" && entry.url.length > 0) {
    return `${name} (url: ${entry.url})`;
  }
  return name;
}
