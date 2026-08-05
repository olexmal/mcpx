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
import { runDoctor } from "./doctor.js";
import { callToolOnServer, listToolsOnServer, probeServer } from "./mcp-client.js";
import { writeError, writeJson } from "./output.js";
import {
  mergeServers,
  parseServerSnippet,
  readClipboard,
  readSnippetFile,
} from "./snippet.js";
import { parseTimeout } from "./timeout.js";

const program = new Command();

program
  .name("mcpx")
  .description(
    "CLI for agent access to configured MCP Servers. JSON on stdout by default; use --pretty for human-readable output.",
  )
  .option(
    "-c, --config <path>",
    "Explicit Config file (wins over MCPX_CONFIG, Project Config, and User Config)",
  )
  .option("--pretty", "Force human-readable (pretty) JSON on stdout")
  .showHelpAfterError(false);

function activeConfigPath(): string {
  const { config } = program.opts<{ config?: string }>();
  return resolveConfigPath(process.env, process.cwd(), config);
}

const server = program
  .command("server")
  .description("Manage configured MCP Servers (list | add | remove)");

server
  .command("list")
  .description("List configured Servers and their Purpose")
  .action(() => {
    try {
      const opts = program.opts<{ pretty?: boolean }>();
      const servers = loadServers(activeConfigPath());
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

type AddOpts = {
  name?: string;
  description?: string;
  command?: string;
  args?: string;
  env?: string;
  url?: string;
  headers?: string;
  fromFile?: string;
  fromClipboard?: boolean;
};

function hasFlagTransport(opts: AddOpts): boolean {
  return (
    opts.description !== undefined ||
    opts.command !== undefined ||
    opts.args !== undefined ||
    opts.env !== undefined ||
    opts.url !== undefined ||
    opts.headers !== undefined
  );
}

function addFromSnippet(raw: string, name: string | undefined): void {
  const configPath = activeConfigPath();
  const existing = loadServers(configPath);
  const incoming = parseServerSnippet(raw, name);
  const merged = mergeServers(existing, incoming);
  saveServers(merged, configPath);
}

function addFromFlags(opts: AddOpts): void {
  if (opts.name === undefined || opts.name.length === 0) {
    throw new Error("Missing required option --name <name>");
  }

  const configPath = activeConfigPath();
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
}

server
  .command("add")
  .description(
    "Add a Server to Config (flags, --from-file, or --from-clipboard)",
  )
  .option("--name <name>", "Server name (Config map key; required for flag add and single-body snippets)")
  .option("--description <text>", "Purpose (optional)")
  .option("--command <cmd>", "Stdio command")
  .option("--args <json>", "Stdio args as a JSON array string")
  .option("--env <json>", "Stdio env as a JSON object string")
  .option("--url <url>", "Streamable HTTP URL")
  .option("--headers <json>", "HTTP headers as a JSON object string")
  .option("--from-file <path>", "Merge Servers from a JSON snippet file")
  .option("--from-clipboard", "Merge Servers from the clipboard (or MCPX_CLIPBOARD)")
  .action((opts: AddOpts) => {
    try {
      const fromFile = opts.fromFile !== undefined;
      const fromClipboard = opts.fromClipboard === true;

      if (fromFile && fromClipboard) {
        throw new Error("Use only one of --from-file or --from-clipboard");
      }

      if (fromFile || fromClipboard) {
        if (hasFlagTransport(opts)) {
          throw new Error(
            "Cannot combine --from-file/--from-clipboard with --command/--url/--args/--env/--headers/--description",
          );
        }
        const raw = fromFile
          ? readSnippetFile(opts.fromFile!)
          : readClipboard();
        addFromSnippet(raw, opts.name);
        return;
      }

      addFromFlags(opts);
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
      const configPath = activeConfigPath();
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

function resolveServer(name: string): ServerConfig {
  const servers = loadServers(activeConfigPath());
  if (!Object.prototype.hasOwnProperty.call(servers, name)) {
    throw new Error(`Server not found (unknown name): ${name}`);
  }
  return servers[name]!;
}

program
  .command("list-tools")
  .description("List Tools on a Server")
  .requiredOption("-s, --server <name>", "Server name")
  .action(async (opts: { server: string }) => {
    try {
      const pretty = program.opts<{ pretty?: boolean }>().pretty === true;
      const entry = resolveServer(opts.server);
      const tools = await listToolsOnServer(entry);
      writeJson(tools, { pretty });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      writeError(message);
    }
  });

program
  .command("doctor")
  .description(
    "Validate Config shape and Probe each Server (MCP initialize)",
  )
  .option("-s, --server <name>", "Check only this Server")
  .option(
    "--timeout <duration>",
    "Per-Server Probe timeout (Ns or Nms, default 10s)",
    "10s",
  )
  .action(async (opts: { server?: string; timeout: string }) => {
    try {
      const timeoutMs = parseTimeout(opts.timeout);
      const pretty = program.opts<{ pretty?: boolean }>().pretty === true;
      const configPath = activeConfigPath();
      const servers = loadServers(configPath);
      const report = await runDoctor({
        configPath,
        servers,
        serverFilter: opts.server,
        timeoutMs,
        probe: probeServer,
      });
      writeJson(report, { pretty });
      if (!report.ok) {
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      writeError(message);
    }
  });

program
  .command("call-tool")
  .description("Call a Tool on a Server")
  .requiredOption("-s, --server <name>", "Server name")
  .requiredOption("-t, --tool <name>", "Tool name")
  .option("--args <json>", "Tool arguments as JSON", "{}")
  .action(async (opts: { server: string; tool: string; args: string }) => {
    try {
      // Validate --args before any connect attempt.
      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(opts.args) as unknown;
      } catch {
        throw new Error(`Invalid JSON for --args: ${opts.args}`);
      }
      if (
        parsedArgs === null ||
        typeof parsedArgs !== "object" ||
        Array.isArray(parsedArgs)
      ) {
        throw new Error("--args must be a JSON object");
      }

      const pretty = program.opts<{ pretty?: boolean }>().pretty === true;
      const entry = resolveServer(opts.server);
      const result = await callToolOnServer(
        entry,
        opts.tool,
        parsedArgs as Record<string, unknown>,
      );
      writeJson(result, { pretty });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      writeError(message);
    }
  });

if (process.argv.slice(2).length === 0) {
  program.outputHelp();
  process.exit(0);
}

await program.parseAsync(process.argv);
