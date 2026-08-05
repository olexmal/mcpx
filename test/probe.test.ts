import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { probeServer } from "../src/mcp-client.js";
import {
  startStubHttpMcp,
  type StubHttpMcpHandle,
} from "./helpers/start-stub-http-mcp.js";

describe("probeServer", () => {
  let stub: StubHttpMcpHandle | undefined;
  let hang: Server | undefined;

  afterEach(async () => {
    if (stub !== undefined) {
      await stub.close();
      stub = undefined;
    }
    if (hang !== undefined) {
      hang.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        hang!.close((err) => (err ? reject(err) : resolve()));
      });
      hang = undefined;
    }
  });

  it("succeeds after MCP initialize against Streamable HTTP", async () => {
    stub = await startStubHttpMcp();
    await expect(
      probeServer({ url: stub.url }, 10_000),
    ).resolves.toBeUndefined();
  });

  it("fails for unreachable URL", async () => {
    await expect(
      probeServer({ url: "http://127.0.0.1:1/mcp" }, 3_000),
    ).rejects.toThrow();
  });

  it("fails with timeout message when Probe exceeds budget", async () => {
    hang = createServer((_req, _res) => {
      // Never respond — Probe must hit timeoutMs.
    });
    await new Promise<void>((resolve) => {
      hang!.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = hang.address();
    if (addr === null || typeof addr === "string") {
      throw new Error("expected TCP address");
    }
    const url = `http://127.0.0.1:${addr.port}/mcp`;
    await expect(probeServer({ url }, 200)).rejects.toThrow(
      /timed out after 200ms/i,
    );
  }, 10_000);

  it("rejects invalid shape before connect", async () => {
    await expect(
      probeServer({ description: "no transport" }, 1_000),
    ).rejects.toThrow(/command|url/i);
  });
});
