/**
 * Start a stub Streamable HTTP MCP Server for CLI acceptance tests.
 * Call close() in afterEach / finally to tear down.
 */
import { createServer, type Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export type StubHttpMcpOptions = {
  /** When set, requests without this exact header value get HTTP 401. */
  requiredHeader?: { name: string; value: string };
};

export type StubHttpMcpHandle = {
  url: string;
  close: () => Promise<void>;
};

function createMcp(): McpServer {
  const server = new McpServer({ name: "stub-http-mcp", version: "1.0.0" });

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

  return server;
}

export async function startStubHttpMcp(
  options: StubHttpMcpOptions = {},
): Promise<StubHttpMcpHandle> {
  const required = options.requiredHeader;

  const httpServer: Server = createServer(async (req, res) => {
    if (required) {
      const got = req.headers[required.name.toLowerCase()];
      const value = Array.isArray(got) ? got[0] : got;
      if (value !== required.value) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Unauthorized: missing required header" },
            id: null,
          }),
        );
        return;
      }
    }

    if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
      res.writeHead(405).end();
      return;
    }

    // Stateless: one transport + MCP server per request (mirrors SDK example).
    const mcp = createMcp();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          }),
        );
      }
    } finally {
      res.on("close", () => {
        void transport.close();
        void mcp.close();
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = httpServer.address();
  if (addr === null || typeof addr === "string") {
    throw new Error("Failed to bind stub HTTP MCP server");
  }

  const url = `http://127.0.0.1:${addr.port}/mcp`;

  return {
    url,
    close: () =>
      new Promise((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
