/**
 * Parse JetBrains / mcp.json-style server snippets for `server add --from-*`.
 *
 * Accepted shapes:
 * 1. Full `{"mcpServers":{...}}` (including a single named Server)
 * 2. Bare map of named Servers `{ "name": { ... } }`
 * 3. Single Server body (has `command` or `url` at the top level) — requires `--name`
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import {
  assertValidTransport,
  type ServerConfig,
} from "./config.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Top-level looks like one Server entry (transport fields present). */
export function looksLikeServerBody(value: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(value, "command") ||
    Object.prototype.hasOwnProperty.call(value, "url")
  );
}

/**
 * Normalize a JSON snippet into a name → ServerConfig map.
 * @param name Required when the snippet is a single Server body without a key.
 */
export function parseServerSnippet(
  raw: string,
  name?: string,
): Record<string, ServerConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid JSON in server snippet");
  }
  if (!isPlainObject(parsed)) {
    throw new Error("Server snippet must be a JSON object");
  }

  if (isPlainObject(parsed.mcpServers)) {
    return parsed.mcpServers as Record<string, ServerConfig>;
  }

  if (looksLikeServerBody(parsed)) {
    if (name === undefined || name.length === 0) {
      throw new Error(
        "Single Server body requires --name <name> (or wrap under mcpServers)",
      );
    }
    return { [name]: parsed as ServerConfig };
  }

  const values = Object.values(parsed);
  if (
    values.length > 0 &&
    values.every((v) => isPlainObject(v))
  ) {
    return parsed as Record<string, ServerConfig>;
  }

  throw new Error(
    "Unrecognized server snippet; expected {\"mcpServers\":{...}}, a bare map of Servers, or a single Server body with --name",
  );
}

/**
 * Merge incoming Servers into existing Config map.
 * Fails atomically on any duplicate name or invalid transport (no partial apply).
 */
export function mergeServers(
  existing: Record<string, ServerConfig>,
  incoming: Record<string, ServerConfig>,
): Record<string, ServerConfig> {
  const names = Object.keys(incoming);
  if (names.length === 0) {
    throw new Error("Server snippet contains no Servers to add");
  }

  const conflicts = names.filter((n) =>
    Object.prototype.hasOwnProperty.call(existing, n),
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Server already exists (duplicate name): ${conflicts.join(", ")}`,
    );
  }

  for (const [n, entry] of Object.entries(incoming)) {
    if (!isPlainObject(entry)) {
      throw new Error(`Server entry must be an object: ${n}`);
    }
    try {
      assertValidTransport(entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${n}: ${message}`);
    }
  }

  return { ...existing, ...incoming };
}

/** Read snippet JSON from a file path. */
export function readSnippetFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Snippet file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Clipboard text for `--from-clipboard`.
 *
 * Override: set `MCPX_CLIPBOARD` to the snippet text (tests / disposable envs).
 * Otherwise tries common Linux/WSL clipboard tools.
 */
export function readClipboard(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.MCPX_CLIPBOARD !== undefined) {
    return env.MCPX_CLIPBOARD;
  }

  const attempts: Array<{ cmd: string; args: string[] }> = [
    { cmd: "wl-paste", args: ["--no-newline"] },
    { cmd: "xclip", args: ["-selection", "clipboard", "-o"] },
    { cmd: "xsel", args: ["--clipboard", "--output"] },
    // WSL: Windows clipboard via PowerShell
    { cmd: "powershell.exe", args: ["-NoProfile", "-Command", "Get-Clipboard"] },
  ];

  for (const { cmd, args } of attempts) {
    const result = spawnSync(cmd, args, {
      encoding: "utf8",
      env,
    });
    if (result.status === 0 && typeof result.stdout === "string") {
      return result.stdout.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }
  }

  throw new Error(
    "Unable to read clipboard (set MCPX_CLIPBOARD for tests, or install wl-paste/xclip/xsel)",
  );
}
