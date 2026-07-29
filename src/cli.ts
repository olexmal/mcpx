#!/usr/bin/env node
import { Command } from "commander";
import {
  assertValidTransport,
  loadServers,
  resolveConfigPath,
  resolvePurpose,
  saveServers,
  type ServerConfig,
} from "./config.js";
import { writeError, writeJson } from "./output.js";

const program = new Command();

program
  .name("mcpx")
  .description(
    "CLI for agent access to configured MCP Servers. JSON on stdout by default; use --pretty for human-readable output.",
  )
  .option("--pretty", "Force human-readable (pretty) JSON on stdout")
  .showHelpAfterError(false);

const server = program
  .command("server")
  .description("Manage configured MCP Servers (list | add | remove)");

server
  .command("list")
  .description("List configured Servers and their Purpose")
  .action(() => {
    try {
      const opts = program.opts<{ pretty?: boolean }>();
      const servers = loadServers(resolveConfigPath());
      const list = Object.entries(servers).map(([name, entry]) => ({
        name,
        purpose: resolvePurpose(name, entry),
      }));
      writeJson(list, { pretty: opts.pretty === true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      writeError(message);
    }
  });

function parseJsonFlag(
  label: string,
  raw: string | undefined,
  expected: "array" | "object",
): unknown | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Invalid JSON for --${label}: ${raw}`);
  }
  if (expected === "array" && !Array.isArray(parsed)) {
    throw new Error(`--${label} must be a JSON array`);
  }
  if (
    expected === "object" &&
    (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
  ) {
    throw new Error(`--${label} must be a JSON object`);
  }
  return parsed;
}

server
  .command("add")
  .description("Add a Server to Config")
  .requiredOption("--name <name>", "Server name (Config map key)")
  .option("--description <text>", "Purpose (optional)")
  .option("--command <cmd>", "Stdio command")
  .option("--args <json>", "Stdio args as a JSON array string")
  .option("--env <json>", "Stdio env as a JSON object string")
  .option("--url <url>", "Streamable HTTP URL")
  .option("--headers <json>", "HTTP headers as a JSON object string")
  .action((opts: {
    name: string;
    description?: string;
    command?: string;
    args?: string;
    env?: string;
    url?: string;
    headers?: string;
  }) => {
    try {
      const configPath = resolveConfigPath();
      const servers = loadServers(configPath);
      if (Object.prototype.hasOwnProperty.call(servers, opts.name)) {
        throw new Error(`Server already exists (duplicate name): ${opts.name}`);
      }

      const entry: ServerConfig = {};
      if (opts.description !== undefined) {
        entry.description = opts.description;
      }
      if (opts.command !== undefined) {
        entry.command = opts.command;
      }
      if (opts.url !== undefined) {
        entry.url = opts.url;
      }

      const args = parseJsonFlag("args", opts.args, "array");
      if (args !== undefined) {
        entry.args = args;
      }
      const env = parseJsonFlag("env", opts.env, "object");
      if (env !== undefined) {
        entry.env = env;
      }
      const headers = parseJsonFlag("headers", opts.headers, "object");
      if (headers !== undefined) {
        entry.headers = headers;
      }

      assertValidTransport(entry);
      servers[opts.name] = entry;
      saveServers(servers, configPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      writeError(message);
    }
  });

server
  .command("remove")
  .description("Remove a Server from Config")
  .argument("<name>", "Server name")
  .action((name: string) => {
    try {
      const configPath = resolveConfigPath();
      const servers = loadServers(configPath);
      if (!Object.prototype.hasOwnProperty.call(servers, name)) {
        throw new Error(`Server not found (unknown name): ${name}`);
      }
      delete servers[name];
      saveServers(servers, configPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      writeError(message);
    }
  });

program
  .command("list-tools")
  .description("List Tools on a Server")
  .requiredOption("-s, --server <name>", "Server name")
  .action(() => {
    writeError("not implemented");
  });

program
  .command("call-tool")
  .description("Call a Tool on a Server")
  .requiredOption("-s, --server <name>", "Server name")
  .requiredOption("-t, --tool <name>", "Tool name")
  .option("--args <json>", "Tool arguments as JSON", "{}")
  .action(() => {
    writeError("not implemented");
  });

if (process.argv.slice(2).length === 0) {
  program.outputHelp();
  process.exit(0);
}

await program.parseAsync(process.argv);
