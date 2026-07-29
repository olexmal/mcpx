import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
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
    expect(result.stdout.trim()).toBe(
      '[{"name":"demo","purpose":"demo (command: true)"}]',
    );
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
    expect(result.stdout).toBe(
      '[\n  {\n    "name": "demo",\n    "purpose": "demo (command: true)"\n  }\n]\n',
    );
  });

  it("uses description as Purpose when set", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          intellij: {
            description: "IntelliJ IDEA MCP",
            url: "http://127.0.0.1:64342/mcp",
          },
        },
      }),
    );

    const result = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(
      '[{"name":"intellij","purpose":"IntelliJ IDEA MCP"}]',
    );
  });

  it("falls back Purpose to name + url when description is omitted", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          intellij: { url: "http://127.0.0.1:64342/mcp" },
        },
      }),
    );

    const result = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(
      '[{"name":"intellij","purpose":"intellij (url: http://127.0.0.1:64342/mcp)"}]',
    );
  });

  it("server list with empty mcpServers prints compact JSON empty array", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }));

    const result = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe("[]");
  });

  it("exits non-zero with clear stderr for malformed Config JSON", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(configPath, "{ not valid json");

    const result = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/Invalid JSON in Config file/i);
    expect(result.stderr).toContain(configPath);
  });

  it("server add with flags persists a Server that appears in server list", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");

    const add = await runMcpx(
      [
        "server",
        "add",
        "--name",
        "db",
        "--description",
        "Local database MCP",
        "--command",
        "npx",
        "--args",
        '["-y","@example/db-mcp"]',
        "--env",
        '{"DB_URL":"postgres://localhost/app"}',
      ],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);
    expect(add.stderr).toBe("");

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers.db).toEqual({
      description: "Local database MCP",
      command: "npx",
      args: ["-y", "@example/db-mcp"],
      env: { DB_URL: "postgres://localhost/app" },
    });

    const list = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(list.exitCode).toBe(0);
    expect(list.stdout.trim()).toBe(
      '[{"name":"db","purpose":"Local database MCP"}]',
    );
  });

  it("server add creates parent Config directory when missing", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "nested", "mcpx", "mcp.json");

    const add = await runMcpx(
      ["server", "add", "--name", "http", "--url", "http://127.0.0.1:9/mcp"],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);
    await access(configPath);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers.http).toEqual({
      url: "http://127.0.0.1:9/mcp",
    });
  });

  it("server add with --url and --headers persists HTTP Server", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");

    const add = await runMcpx(
      [
        "server",
        "add",
        "--name",
        "intellij",
        "--description",
        "IntelliJ IDEA MCP",
        "--url",
        "http://127.0.0.1:64342/mcp",
        "--headers",
        '{"Authorization":"Bearer token"}',
      ],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers.intellij).toEqual({
      description: "IntelliJ IDEA MCP",
      url: "http://127.0.0.1:64342/mcp",
      headers: { Authorization: "Bearer token" },
    });
  });

  it("server add rejects duplicate Server name without overwrite", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { demo: { command: "true", description: "original" } },
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--name", "demo", "--command", "false"],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stdout).toBe("");
    expect(add.stderr).toMatch(/already exists|duplicate/i);
    expect(add.stderr).toMatch(/demo/);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, { command?: string; description?: string }>;
    };
    expect(raw.mcpServers.demo).toEqual({
      command: "true",
      description: "original",
    });
  });

  it("server remove deletes a Server; unknown name fails clearly", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          keep: { command: "true" },
          drop: { url: "http://127.0.0.1:9/mcp" },
        },
      }),
    );

    const remove = await runMcpx(["server", "remove", "drop"], {
      mcpConfig: configPath,
    });
    expect(remove.exitCode).toBe(0);
    expect(remove.stderr).toBe("");

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(raw.mcpServers)).toEqual(["keep"]);

    const unknown = await runMcpx(["server", "remove", "missing"], {
      mcpConfig: configPath,
    });
    expect(unknown.exitCode).not.toBe(0);
    expect(unknown.stdout).toBe("");
    expect(unknown.stderr).toMatch(/not found|unknown|does not exist/i);
    expect(unknown.stderr).toMatch(/missing/);
  });

  it("server add rejects Server with neither command nor url", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");

    const add = await runMcpx(
      ["server", "add", "--name", "empty", "--description", "no transport"],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stdout).toBe("");
    expect(add.stderr).toMatch(/command|url/i);
  });

  it("server add rejects Server with both command and url", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");

    const add = await runMcpx(
      [
        "server",
        "add",
        "--name",
        "both",
        "--command",
        "npx",
        "--url",
        "http://127.0.0.1:9/mcp",
      ],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stdout).toBe("");
    expect(add.stderr).toMatch(/both|command.*url|url.*command/i);
  });

  it("server add rejects invalid --args JSON", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");

    const add = await runMcpx(
      [
        "server",
        "add",
        "--name",
        "bad-args",
        "--command",
        "npx",
        "--args",
        "not-json",
      ],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stdout).toBe("");
    expect(add.stderr).toMatch(/args/i);
  });
});
