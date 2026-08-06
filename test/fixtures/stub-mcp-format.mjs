/**
 * Stdio MCP stub with a Tool whose inputSchema uses format:email only (no pattern).
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "stub-mcp-format", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "email_check",
      description: "Requires format:email only",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const email = req.params.arguments?.email;
  return {
    content: [{ type: "text", text: String(email) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
