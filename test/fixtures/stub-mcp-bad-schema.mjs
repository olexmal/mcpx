/**
 * Stdio MCP stub that advertises a Tool whose inputSchema has a remote $ref
 * (unusable without network). Used to assert call-tool fails closed.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "stub-mcp-bad-schema", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "remote_ref",
      description: "Tool with remote $ref inputSchema",
      inputSchema: {
        type: "object",
        properties: {
          value: { $ref: "https://example.invalid/schemas/string.json" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async () => ({
  content: [{ type: "text", text: "should not be called" }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
