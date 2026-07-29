import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "stub-mcp", version: "1.0.0" });

server.registerTool(
  "echo",
  {
    description: "Echo a message",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: String(message) }],
  }),
);

server.registerTool(
  "fail",
  {
    description: "Always returns a tool error",
  },
  async () => ({
    content: [{ type: "text", text: "intentional tool failure" }],
    isError: true,
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
