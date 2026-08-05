import { describe, expect, it, vi } from "vitest";
import type { ServerConfig } from "../src/config.js";
import { runDoctor, type ProbeFn } from "../src/doctor.js";

describe("runDoctor", () => {
  const configPath = "/tmp/mcp.json";

  it("returns ok empty report for Empty Config", async () => {
    const probe = vi.fn<ProbeFn>();
    const report = await runDoctor({
      configPath,
      servers: {},
      timeoutMs: 10_000,
      probe,
    });
    expect(report).toEqual({
      ok: true,
      configPath,
      servers: [],
    });
    expect(probe).not.toHaveBeenCalled();
  });

  it("throws for unknown server filter", async () => {
    await expect(
      runDoctor({
        configPath,
        servers: { a: { command: "true" } },
        serverFilter: "missing",
        timeoutMs: 10_000,
        probe: vi.fn(),
      }),
    ).rejects.toThrow(/unknown name/i);
  });

  it("records shape_error and skips probe", async () => {
    const probe = vi.fn<ProbeFn>();
    const report = await runDoctor({
      configPath,
      servers: { bad: { description: "no transport" } },
      timeoutMs: 10_000,
      probe,
    });
    expect(report.ok).toBe(false);
    expect(report.servers).toEqual([
      {
        name: "bad",
        status: "shape_error",
        error: expect.stringMatching(/command|url/i),
      },
    ]);
    expect(probe).not.toHaveBeenCalled();
  });

  it("records ok when probe succeeds", async () => {
    const entry: ServerConfig = { url: "http://127.0.0.1:1/mcp" };
    const probe = vi.fn<ProbeFn>().mockResolvedValue(undefined);
    const report = await runDoctor({
      configPath,
      servers: { good: entry },
      timeoutMs: 5_000,
      probe,
    });
    expect(report).toEqual({
      ok: true,
      configPath,
      servers: [{ name: "good", status: "ok" }],
    });
    expect(probe).toHaveBeenCalledWith(entry, 5_000);
  });

  it("records probe_error with optional SSE hint", async () => {
    const probe = vi
      .fn<ProbeFn>()
      .mockRejectedValue(new Error("got text/event-stream"));
    const report = await runDoctor({
      configPath,
      servers: { sse: { url: "http://127.0.0.1:1/mcp" } },
      timeoutMs: 10_000,
      probe,
    });
    expect(report.ok).toBe(false);
    expect(report.servers[0]).toMatchObject({
      name: "sse",
      status: "probe_error",
      error: "got text/event-stream",
      hint: expect.stringMatching(/Streamable HTTP/i),
    });
  });

  it("continues after failures and probes sequentially", async () => {
    const order: string[] = [];
    const probe: ProbeFn = async (entry) => {
      order.push(String(entry.url));
      if (String(entry.url).includes("fail")) {
        throw new Error("down");
      }
    };
    const report = await runDoctor({
      configPath,
      servers: {
        a: { url: "http://127.0.0.1:1/ok" },
        b: { url: "http://127.0.0.1:1/fail" },
        c: { url: "http://127.0.0.1:1/ok2" },
      },
      timeoutMs: 10_000,
      probe,
    });
    expect(order).toEqual([
      "http://127.0.0.1:1/ok",
      "http://127.0.0.1:1/fail",
      "http://127.0.0.1:1/ok2",
    ]);
    expect(report.servers.map((s) => s.status)).toEqual([
      "ok",
      "probe_error",
      "ok",
    ]);
    expect(report.ok).toBe(false);
  });

  it("records probe_error when probe times out", async () => {
    const probe = vi
      .fn<ProbeFn>()
      .mockRejectedValue(new Error("timed out after 200ms"));
    const report = await runDoctor({
      configPath,
      servers: { slow: { url: "http://127.0.0.1:1/mcp" } },
      timeoutMs: 200,
      probe,
    });
    expect(report.ok).toBe(false);
    expect(report.servers[0]).toEqual({
      name: "slow",
      status: "probe_error",
      error: "timed out after 200ms",
    });
  });

  it("filters to a single Server when serverFilter is set", async () => {
    const probe = vi.fn<ProbeFn>().mockResolvedValue(undefined);
    const report = await runDoctor({
      configPath,
      servers: {
        a: { command: "true" },
        b: { command: "false" },
      },
      serverFilter: "b",
      timeoutMs: 10_000,
      probe,
    });
    expect(report.servers).toEqual([{ name: "b", status: "ok" }]);
    expect(probe).toHaveBeenCalledTimes(1);
  });
});
