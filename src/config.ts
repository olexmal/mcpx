/**
 * Config path resolution.
 *
 * Explicit override (highest first): `--config` / `-c`, then `MCPX_CONFIG`.
 * Both accept a file path (absolute or cwd-relative); leading `~` / `~/…`
 * expands to home. An existing directory path is an error.
 *
 * Default: Project Config at `cwd/.mcpx/mcp.json` when that file exists;
 * otherwise User Config at `~/.mcpx/mcp.json` (or `$HOME/.mcpx/mcp.json`).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function expandLeadingTilde(raw: string, home: string): string {
  if (raw === "~") {
    return home;
  }
  if (raw.startsWith("~/") || raw.startsWith("~\\")) {
    return path.join(home, raw.slice(2));
  }
  return raw;
}

/** Normalize an explicit override path; reject when it names an existing directory. */
function normalizeOverridePath(
  raw: string,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string {
  const home = env.HOME ?? os.homedir();
  const resolved = path.resolve(cwd, expandLeadingTilde(raw, home));
  let st: fs.Stats;
  try {
    st = fs.statSync(resolved);
  } catch {
    // Missing path is fine (Empty Config on read / create on write).
    return resolved;
  }
  if (st.isDirectory()) {
    throw new Error(
      `Config path is a directory, expected a file: ${resolved}`,
    );
  }
  return resolved;
}

export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  configFlag?: string,
): string {
  if (configFlag !== undefined) {
    if (configFlag.length === 0) {
      throw new Error("Config path must not be empty");
    }
    return normalizeOverridePath(configFlag, env, cwd);
  }
  if (env.MCPX_CONFIG && env.MCPX_CONFIG.length > 0) {
    return normalizeOverridePath(env.MCPX_CONFIG, env, cwd);
  }
  const projectPath = path.join(cwd, ".mcpx", "mcp.json");
  if (isFile(projectPath)) {
    return projectPath;
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

/**
 * Persist mcpServers to Config. Creates the parent directory when missing.
 */
export function saveServers(
  servers: Record<string, ServerConfig>,
  configPath: string = resolveConfigPath(),
): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`;
  fs.writeFileSync(configPath, payload, "utf8");
}

/** True when the entry has a usable stdio `command`. */
export function hasCommand(entry: ServerConfig): boolean {
  return typeof entry.command === "string" && entry.command.length > 0;
}

/** True when the entry has a usable HTTP `url`. */
export function hasUrl(entry: ServerConfig): boolean {
  return typeof entry.url === "string" && entry.url.length > 0;
}

function assertStringMap(
  label: string,
  value: unknown,
): void {
  if (value === undefined) {
    return;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Server config ${label} must be an object of string values`);
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (typeof v !== "string") {
      throw new Error(`Server config ${label} must be an object of string values`);
    }
  }
}

/**
 * Full static Server entry shape: transport exclusivity, field types, and
 * http(s) URL parse. Shared by doctor, server add, and tool pre-connect.
 */
export function assertValidServerEntry(entry: ServerConfig): void {
  if (entry.command !== undefined) {
    if (typeof entry.command !== "string" || entry.command.length === 0) {
      throw new Error("Server config command must be a non-empty string");
    }
  }
  if (entry.url !== undefined) {
    if (typeof entry.url !== "string" || entry.url.length === 0) {
      throw new Error("Server config url must be a non-empty string");
    }
  }

  if (entry.args !== undefined) {
    if (
      !Array.isArray(entry.args) ||
      !entry.args.every((a) => typeof a === "string")
    ) {
      throw new Error("Server config args must be an array of strings");
    }
  }

  assertStringMap("env", entry.env);
  assertStringMap("headers", entry.headers);

  const stdio = hasCommand(entry);
  const http = hasUrl(entry);
  if (!stdio && !http) {
    throw new Error(
      "Server must have either command (stdio) or url (HTTP), not neither",
    );
  }
  if (stdio && http) {
    throw new Error(
      "Server must not have both command and url; choose one transport",
    );
  }

  if (http) {
    let parsed: URL;
    try {
      parsed = new URL(entry.url as string);
    } catch {
      throw new Error(`Server config url is not a valid URL: ${entry.url}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `Server config url must use http or https, got ${parsed.protocol}`,
      );
    }
  }
}

/**
 * Transport rule: exactly one of stdio (`command`) or HTTP (`url`).
 * Prefer {@link assertValidServerEntry} for full static checks.
 */
export function assertValidTransport(entry: ServerConfig): void {
  assertValidServerEntry(entry);
}
