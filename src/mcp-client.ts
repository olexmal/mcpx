/**
 * Short-lived MCP client: connect → one operation → disconnect.
 * Transports: stdio (`command`) and Streamable HTTP (`url`, optional `headers`).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  hasCommand,
  hasUrl,
  type ServerConfig,
} from "./config.js";

export type ListedTool = {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
};

function stringEnv(
  env: Record<string, unknown> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (env === undefined) {
    return out;
  }
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function processEnvStrings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function stdioArgs(entry: ServerConfig): string[] {
  if (entry.args === undefined) {
    return [];
  }
  if (!Array.isArray(entry.args) || !entry.args.every((a) => typeof a === "string")) {
    throw new Error("Server config args must be an array of strings");
  }
  return entry.args as string[];
}

function stdioEnv(entry: ServerConfig): Record<string, string> {
  const extra =
    entry.env !== undefined &&
    entry.env !== null &&
    typeof entry.env === "object" &&
    !Array.isArray(entry.env)
      ? stringEnv(entry.env as Record<string, unknown>)
      : {};
  return { ...processEnvStrings(), ...extra };
}

function httpHeaders(entry: ServerConfig): Record<string, string> {
  if (entry.headers === undefined || entry.headers === null) {
    return {};
  }
  if (typeof entry.headers !== "object" || Array.isArray(entry.headers)) {
    throw new Error("Server config headers must be an object of string values");
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    entry.headers as Record<string, unknown>,
  )) {
    if (typeof value !== "string") {
      throw new Error("Server config headers must be an object of string values");
    }
    out[key] = value;
  }
  return out;
}

function createTransport(entry: ServerConfig): Transport {
  const cmd = hasCommand(entry);
  const url = hasUrl(entry);
  if (cmd && url) {
    throw new Error(
      "Server must not have both command (stdio) and url (HTTP)",
    );
  }
  if (!cmd && !url) {
    throw new Error(
      "Server must have either command (stdio) or url (HTTP)",
    );
  }
  if (url) {
    const headers = httpHeaders(entry);
    const opts =
      Object.keys(headers).length > 0
        ? { requestInit: { headers } }
        : undefined;
    return new StreamableHTTPClientTransport(
      new URL(entry.url as string),
      opts,
    );
  }

  return new StdioClientTransport({
    command: entry.command as string,
    args: stdioArgs(entry),
    env: stdioEnv(entry),
    stderr: "pipe",
  });
}

/**
 * Run one MCP operation against a Config Server, always disconnecting.
 */
export async function withServerClient<T>(
  entry: ServerConfig,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = createTransport(entry);
  const client = new Client({ name: "mcpx", version: "0.1.0" });
  try {
    await client.connect(transport);
    return await fn(client);
  } finally {
    try {
      await client.close();
    } catch {
      // ignore close errors after a failed connect/op
    }
  }
}

export async function listToolsOnServer(
  entry: ServerConfig,
): Promise<ListedTool[]> {
  return withServerClient(entry, async (client) => {
    const result = await client.listTools();
    return result.tools.map((tool) => {
      const listed: ListedTool = {
        name: tool.name,
        inputSchema: tool.inputSchema as ListedTool["inputSchema"],
      };
      if (tool.description !== undefined) {
        listed.description = tool.description;
      }
      return listed;
    });
  });
}

export async function callToolOnServer(
  entry: ServerConfig,
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return withServerClient(entry, async (client) => {
    const result = await client.callTool({ name: tool, arguments: args });
    if (
      result !== null &&
      typeof result === "object" &&
      "isError" in result &&
      (result as { isError?: boolean }).isError === true
    ) {
      const content = (result as { content?: Array<{ type?: string; text?: string }> })
        .content;
      const text =
        content
          ?.filter((c) => c.type === "text" && typeof c.text === "string")
          .map((c) => c.text)
          .join("\n") || "Tool returned an error";
      throw new Error(`Tool error: ${text}`);
    }
    return result;
  });
}
