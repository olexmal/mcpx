import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runMcpx } from "./helpers/run-mcpx.js";

describe("mcpx CLI harness", () => {
  it("prints help and exits 0 for --help", async () => {
    const result = await runMcpx(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Usage:/i);
    expect(result.stdout).toMatch(/server/);
    expect(result.stdout).toMatch(/list \| add \| remove/);
    expect(result.stdout).toMatch(/list-tools/);
    expect(result.stdout).toMatch(/call-tool/);
  });

  it("prints help and exits 0 when invoked with no args", async () => {
    const result = await runMcpx([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Usage:/i);
    expect(result.stdout).toMatch(/server/);
  });

  it("exits non-zero with stderr for an unknown command", async () => {
    const result = await runMcpx(["not-a-command"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("server list with missing config prints compact JSON empty array on stdout", async () => {
    const result = await runMcpx(["server", "list"], {
      mcpConfig: "/tmp/mcpx-does-not-exist-ticket01/mcp.json",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe("[]");
  });

  it("reads Config from MCPX_CONFIG and prints compact JSON by default", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { demo: { command: "true" } },
      }),
    );

    const result = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe('[{"name":"demo"}]');
  });

  it("forces pretty JSON when --pretty is set", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { demo: { command: "true" } },
      }),
    );

    const result = await runMcpx(["--pretty", "server", "list"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('[\n  {\n    "name": "demo"\n  }\n]\n');
  });
});
