#!/usr/bin/env node
import { Command } from "commander";
import { loadServers, resolveConfigPath, resolvePurpose } from "./config.js";
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

server
  .command("add")
  .description("Add a Server to Config")
  .action(() => {
    writeError("not implemented");
  });

server
  .command("remove")
  .description("Remove a Server from Config")
  .argument("<name>", "Server name")
  .action(() => {
    writeError("not implemented");
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
