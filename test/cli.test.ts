import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runMcpx } from "./helpers/run-mcpx.js";
import {
  startStubHttpMcp,
  type StubHttpMcpHandle,
} from "./helpers/start-stub-http-mcp.js";

describe("mcpx CLI harness", () => {
  it("prints help and exits 0 for --help", async () => {
    const result = await runMcpx(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Usage:/i);
    expect(result.stdout).toMatch(/server/);
    expect(result.stdout).toMatch(/list \| add \| remove/);
    expect(result.stdout).toMatch(/list-tools/);
    expect(result.stdout).toMatch(/call-tool/);
    expect(result.stdout).toMatch(/doctor/);
    expect(result.stdout).toMatch(/--config/);
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

  it("reads User Config from HOME when mcpConfig is omitted (cwd + clear MCPX_CONFIG)", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-cwd-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(home, ".mcpx", "mcp.json"),
      JSON.stringify({
        mcpServers: { fromhome: { command: "true" } },
      }),
    );

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: {
        HOME: home,
        // Must be ignored when mcpConfig option is omitted
        MCPX_CONFIG: "/tmp/mcpx-harness-should-ignore/mcp.json",
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(
      '[{"name":"fromhome","purpose":"fromhome (command: true)"}]',
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

  it("server add --from-file merges full mcpServers snippet", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { keep: { command: "true" } },
      }),
    );
    const snippetPath = path.join(dir, "snippet.json");
    await writeFile(
      snippetPath,
      JSON.stringify({
        mcpServers: {
          intellij: {
            description: "IntelliJ IDEA MCP",
            url: "http://127.0.0.1:64342/mcp",
          },
          db: {
            command: "npx",
            args: ["-y", "@example/db-mcp"],
          },
        },
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);
    expect(add.stderr).toBe("");

    const list = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(list.exitCode).toBe(0);
    const names = (
      JSON.parse(list.stdout) as Array<{ name: string }>
    ).map((e) => e.name);
    expect(names.sort()).toEqual(["db", "intellij", "keep"]);
  });

  it("server add --from-file merges bare map of Servers", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const snippetPath = path.join(dir, "bare.json");
    await writeFile(
      snippetPath,
      JSON.stringify({
        stdio: { command: "npx", args: ["-y", "pkg"] },
        http: { url: "http://127.0.0.1:9/mcp" },
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(raw.mcpServers).sort()).toEqual(["http", "stdio"]);
  });

  it("server add --from-file merges JetBrains-style single Server under mcpServers", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const snippetPath = path.join(dir, "jb.json");
    await writeFile(
      snippetPath,
      JSON.stringify({
        mcpServers: {
          "intellij-http": {
            url: "http://127.0.0.1:64342/mcp",
            headers: { Authorization: "Bearer t" },
          },
        },
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);

    const list = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(list.stdout.trim()).toBe(
      '[{"name":"intellij-http","purpose":"intellij-http (url: http://127.0.0.1:64342/mcp)"}]',
    );
  });

  it("server add --from-file accepts single Server body with --name", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const snippetPath = path.join(dir, "body.json");
    await writeFile(
      snippetPath,
      JSON.stringify({
        command: "npx",
        args: ["-y", "pkg"],
        description: "from body",
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath, "--name", "named"],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).toBe(0);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers.named).toEqual({
      command: "npx",
      args: ["-y", "pkg"],
      description: "from body",
    });
  });

  it("server add --from-file rejects single Server body without --name", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const snippetPath = path.join(dir, "body.json");
    await writeFile(
      snippetPath,
      JSON.stringify({ command: "npx" }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stdout).toBe("");
    expect(add.stderr).toMatch(/--name/i);
  });

  it("server add --from-file rejects duplicate names atomically", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          demo: { command: "true", description: "original" },
        },
      }),
    );
    const snippetPath = path.join(dir, "conflict.json");
    await writeFile(
      snippetPath,
      JSON.stringify({
        mcpServers: {
          demo: { command: "false" },
          other: { url: "http://127.0.0.1:9/mcp" },
        },
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stdout).toBe("");
    expect(add.stderr).toMatch(/already exists|duplicate/i);
    expect(add.stderr).toMatch(/demo/);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers).toEqual({
      demo: { command: "true", description: "original" },
    });
  });

  it("server add --from-file rejects invalid transport without writing", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }));
    const snippetPath = path.join(dir, "bad.json");
    await writeFile(
      snippetPath,
      JSON.stringify({
        mcpServers: {
          ok: { command: "true" },
          bad: { description: "neither" },
        },
      }),
    );

    const add = await runMcpx(
      ["server", "add", "--from-file", snippetPath],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stderr).toMatch(/command|url/i);

    const raw = JSON.parse(await readFile(configPath, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers).toEqual({});
  });

  it("server add --from-clipboard merges via MCPX_CLIPBOARD env", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const snippet = JSON.stringify({
      mcpServers: {
        clipped: { url: "http://127.0.0.1:9/mcp", description: "from clip" },
      },
    });

    const add = await runMcpx(["server", "add", "--from-clipboard"], {
      mcpConfig: configPath,
      env: { MCPX_CLIPBOARD: snippet },
    });
    expect(add.exitCode).toBe(0);
    expect(add.stderr).toBe("");

    const list = await runMcpx(["server", "list"], { mcpConfig: configPath });
    expect(list.stdout.trim()).toBe(
      '[{"name":"clipped","purpose":"from clip"}]',
    );
  });

  it("server add rejects mixing --from-file with transport flags", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const snippetPath = path.join(dir, "snippet.json");
    await writeFile(
      snippetPath,
      JSON.stringify({ mcpServers: { a: { command: "true" } } }),
    );

    const add = await runMcpx(
      [
        "server",
        "add",
        "--from-file",
        snippetPath,
        "--command",
        "npx",
      ],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stderr.length).toBeGreaterThan(0);
  });
});

describe("mcpx list-tools / call-tool (stdio)", () => {
  const fixturePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/stub-mcp-server.mjs",
  );

  async function configWithStub(
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          stub: {
            description: "Stub stdio MCP",
            command: process.execPath,
            args: [fixturePath],
            ...extra,
          },
        },
      }),
    );
    return configPath;
  }

  it("list-tools requires --server / -s", async () => {
    const result = await runMcpx(["list-tools"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stderr).toMatch(/server/i);
  });

  it("call-tool requires --server / -s", async () => {
    const result = await runMcpx(["call-tool", "--tool", "echo"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stderr).toMatch(/server/i);
  });

  it("list-tools fails clearly for unknown Server", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }));

    const result = await runMcpx(["list-tools", "--server", "missing"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/not found|unknown/i);
    expect(result.stderr).toMatch(/missing/);
  });

  it("list-tools returns tool names, descriptions, and inputSchemas as JSON", async () => {
    const configPath = await configWithStub();

    const result = await runMcpx(["list-tools", "-s", "stub"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const tools = JSON.parse(result.stdout) as Array<{
      name: string;
      description?: string;
      inputSchema: unknown;
    }>;
    expect(Array.isArray(tools)).toBe(true);
    const echo = tools.find((t) => t.name === "echo");
    expect(echo).toBeDefined();
    expect(echo!.description).toMatch(/echo/i);
    expect(echo!.inputSchema).toEqual(
      expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          message: expect.objectContaining({ type: "string" }),
        }),
      }),
    );
  });

  it("call-tool returns Tool result as JSON", async () => {
    const configPath = await configWithStub();

    const result = await runMcpx(
      [
        "call-tool",
        "--server",
        "stub",
        "--tool",
        "echo",
        "--args",
        '{"message":"hello"}',
      ],
      { mcpConfig: configPath },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(payload.content).toEqual([{ type: "text", text: "hello" }]);
  });

  it("call-tool rejects invalid --args JSON before connecting", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    // command that would fail if we connected
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          broken: {
            command: process.execPath,
            args: ["-e", "process.exit(1)"],
          },
        },
      }),
    );

    const result = await runMcpx(
      [
        "call-tool",
        "--server",
        "broken",
        "--tool",
        "echo",
        "--args",
        "not-json",
      ],
      { mcpConfig: configPath },
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/args|json/i);
    expect(result.stderr).not.toMatch(/connect|spawn|Connection closed/i);
  });

  it("list-tools fails on connect failure", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          dead: {
            command: process.execPath,
            args: ["-e", "process.exit(1)"],
          },
        },
      }),
    );

    const result = await runMcpx(["list-tools", "--server", "dead"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("list-tools rejects hand-edited Config with both command and url", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          both: {
            command: process.execPath,
            url: "http://127.0.0.1:9/mcp",
          },
        },
      }),
    );

    const result = await runMcpx(["list-tools", "--server", "both"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/both command.*url|must not have both/i);
  });

  it("call-tool fails clearly when Tool returns isError", async () => {
    const configPath = await configWithStub();

    const result = await runMcpx(
      ["call-tool", "--server", "stub", "--tool", "fail", "--args", "{}"],
      { mcpConfig: configPath },
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stderr).toMatch(/fail|error|intentional/i);
  });

  it("list-tools / call-tool have no --command or --url bypass", async () => {
    const listHelp = await runMcpx(["list-tools", "--help"]);
    expect(listHelp.exitCode).toBe(0);
    expect(listHelp.stdout).not.toMatch(/--command/);
    expect(listHelp.stdout).not.toMatch(/--url/);

    const callHelp = await runMcpx(["call-tool", "--help"]);
    expect(callHelp.exitCode).toBe(0);
    expect(callHelp.stdout).not.toMatch(/--command/);
    expect(callHelp.stdout).not.toMatch(/--url/);
  });
});

describe("mcpx list-tools / call-tool (Streamable HTTP)", () => {
  let stub: StubHttpMcpHandle | undefined;

  afterEach(async () => {
    if (stub !== undefined) {
      await stub.close();
      stub = undefined;
    }
  });

  async function configWithHttp(
    entry: Record<string, unknown>,
  ): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          httpstub: {
            description: "Stub HTTP MCP",
            ...entry,
          },
        },
      }),
    );
    return configPath;
  }

  it("list-tools returns tool names, descriptions, and inputSchemas as JSON", async () => {
    stub = await startStubHttpMcp();
    const configPath = await configWithHttp({ url: stub.url });

    const result = await runMcpx(["list-tools", "-s", "httpstub"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const tools = JSON.parse(result.stdout) as Array<{
      name: string;
      description?: string;
      inputSchema: unknown;
    }>;
    expect(Array.isArray(tools)).toBe(true);
    const echo = tools.find((t) => t.name === "echo");
    expect(echo).toBeDefined();
    expect(echo!.description).toMatch(/echo/i);
    expect(echo!.inputSchema).toEqual(
      expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          message: expect.objectContaining({ type: "string" }),
        }),
      }),
    );
  });

  it("call-tool returns Tool result as JSON", async () => {
    stub = await startStubHttpMcp();
    const configPath = await configWithHttp({ url: stub.url });

    const result = await runMcpx(
      [
        "call-tool",
        "--server",
        "httpstub",
        "--tool",
        "echo",
        "--args",
        '{"message":"hello-http"}',
      ],
      { mcpConfig: configPath },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(payload.content).toEqual([{ type: "text", text: "hello-http" }]);
  });

  it("sends optional headers from Config on the HTTP transport", async () => {
    stub = await startStubHttpMcp({
      requiredHeader: { name: "x-test-auth", value: "secret-token" },
    });
    const configPath = await configWithHttp({
      url: stub.url,
      headers: { "x-test-auth": "secret-token" },
    });

    const result = await runMcpx(["list-tools", "--server", "httpstub"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const tools = JSON.parse(result.stdout) as Array<{ name: string }>;
    expect(tools.some((t) => t.name === "echo")).toBe(true);
  });

  it("fails clearly when required headers are missing", async () => {
    stub = await startStubHttpMcp({
      requiredHeader: { name: "x-test-auth", value: "secret-token" },
    });
    const configPath = await configWithHttp({ url: stub.url });

    const result = await runMcpx(["list-tools", "--server", "httpstub"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("list-tools fails on connect failure (unreachable URL)", async () => {
    const configPath = await configWithHttp({
      url: "http://127.0.0.1:1/mcp",
    });

    const result = await runMcpx(["list-tools", "--server", "httpstub"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("call-tool fails clearly when Tool returns isError", async () => {
    stub = await startStubHttpMcp();
    const configPath = await configWithHttp({ url: stub.url });

    const result = await runMcpx(
      ["call-tool", "--server", "httpstub", "--tool", "fail", "--args", "{}"],
      { mcpConfig: configPath },
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stderr).toMatch(/fail|error|intentional/i);
  });
});

describe("Project Config", () => {
  const fixturePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/stub-mcp-server.mjs",
  );

  async function setupHomeAndCwd(): Promise<{
    home: string;
    cwd: string;
    userConfig: string;
    projectConfig: string;
  }> {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-proj-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    const userConfig = path.join(home, ".mcpx", "mcp.json");
    await writeFile(
      userConfig,
      JSON.stringify({
        mcpServers: { homeserver: { command: "true", description: "home" } },
      }),
    );
    await mkdir(path.join(cwd, ".mcpx"), { recursive: true });
    const projectConfig = path.join(cwd, ".mcpx", "mcp.json");
    return { home, cwd, userConfig, projectConfig };
  }

  it("server list uses Project Config and ignores User Config when project file exists", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(
      projectConfig,
      JSON.stringify({
        mcpServers: { proj: { command: "true", description: "project" } },
      }),
    );

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"proj","purpose":"project"}]',
    );
  });

  it("empty Project Config yields empty list (no User Config fallthrough)", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(projectConfig, JSON.stringify({ mcpServers: {} }));

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("[]");
  });

  it("bare {} Project Config yields empty list", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(projectConfig, "{}");

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("[]");
  });

  it("missing Project Config falls back to User Config", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-proj-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(home, ".mcpx", "mcp.json"),
      JSON.stringify({
        mcpServers: { homeserver: { command: "true", description: "home" } },
      }),
    );

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"homeserver","purpose":"home"}]',
    );
  });

  it(".mcpx directory without mcp.json does not activate Project Config", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-proj-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(home, ".mcpx", "mcp.json"),
      JSON.stringify({
        mcpServers: { homeserver: { command: "true", description: "home" } },
      }),
    );
    await mkdir(path.join(cwd, ".mcpx"), { recursive: true });

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"homeserver","purpose":"home"}]',
    );
  });

  it("subdirectory cwd without its own project file uses User Config (no ancestor walk)", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(
      projectConfig,
      JSON.stringify({
        mcpServers: { proj: { command: "true", description: "project" } },
      }),
    );
    const sub = path.join(cwd, "packages", "app");
    await mkdir(sub, { recursive: true });

    const result = await runMcpx(["server", "list"], {
      cwd: sub,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"homeserver","purpose":"home"}]',
    );
  });

  it("MCPX_CONFIG wins when Project Config also exists", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(
      projectConfig,
      JSON.stringify({
        mcpServers: { proj: { command: "true", description: "project" } },
      }),
    );
    const override = path.join(cwd, "override.json");
    await writeFile(
      override,
      JSON.stringify({
        mcpServers: { env: { command: "true", description: "override" } },
      }),
    );

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
      mcpConfig: override,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"env","purpose":"override"}]',
    );
  });

  it("server add writes Project Config when project file exists", async () => {
    const { home, cwd, projectConfig, userConfig } = await setupHomeAndCwd();
    await writeFile(projectConfig, JSON.stringify({ mcpServers: {} }));

    const add = await runMcpx(
      [
        "server",
        "add",
        "--name",
        "added",
        "--command",
        "true",
        "--description",
        "from add",
      ],
      { cwd, env: { HOME: home } },
    );
    expect(add.exitCode).toBe(0);

    const projectRaw = JSON.parse(await readFile(projectConfig, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(projectRaw.mcpServers.added).toEqual({
      command: "true",
      description: "from add",
    });

    const userRaw = JSON.parse(await readFile(userConfig, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(userRaw.mcpServers.added).toBeUndefined();
    expect(userRaw.mcpServers.homeserver).toBeDefined();
  });

  it("server add without Project Config writes User Config and does not create project file", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-proj-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(home, ".mcpx", "mcp.json"),
      JSON.stringify({ mcpServers: {} }),
    );

    const add = await runMcpx(
      ["server", "add", "--name", "u", "--command", "true"],
      { cwd, env: { HOME: home } },
    );
    expect(add.exitCode).toBe(0);

    const userRaw = JSON.parse(
      await readFile(path.join(home, ".mcpx", "mcp.json"), "utf8"),
    ) as { mcpServers: Record<string, unknown> };
    expect(userRaw.mcpServers.u).toBeDefined();

    await expect(access(path.join(cwd, ".mcpx", "mcp.json"))).rejects.toThrow();
  });

  it("server remove mutates Project Config when active", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(
      projectConfig,
      JSON.stringify({
        mcpServers: {
          keep: { command: "true" },
          drop: { command: "true" },
        },
      }),
    );

    const remove = await runMcpx(["server", "remove", "drop"], {
      cwd,
      env: { HOME: home },
    });
    expect(remove.exitCode).toBe(0);

    const raw = JSON.parse(await readFile(projectConfig, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(raw.mcpServers.drop).toBeUndefined();
    expect(raw.mcpServers.keep).toBeDefined();
  });

  it("malformed Project Config fails with project path on stderr", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(projectConfig, "{ not json");

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(projectConfig);
  });

  it("zero-byte Project Config is invalid Config (not Empty Config, not User fallthrough)", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(projectConfig, "");

    const result = await runMcpx(["server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(projectConfig);
  });

  it("list-tools resolves Servers from Project Config", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(
      projectConfig,
      JSON.stringify({
        mcpServers: {
          stub: {
            command: process.execPath,
            args: [fixturePath],
          },
        },
      }),
    );

    const result = await runMcpx(["list-tools", "-s", "stub"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    const tools = JSON.parse(result.stdout) as Array<{ name: string }>;
    expect(tools.some((t) => t.name === "echo")).toBe(true);
  });

  it("call-tool resolves Servers from Project Config", async () => {
    const { home, cwd, projectConfig } = await setupHomeAndCwd();
    await writeFile(
      projectConfig,
      JSON.stringify({
        mcpServers: {
          stub: {
            command: process.execPath,
            args: [fixturePath],
          },
        },
      }),
    );

    const result = await runMcpx(
      [
        "call-tool",
        "-s",
        "stub",
        "--tool",
        "echo",
        "--args",
        '{"message":"from-project"}',
      ],
      { cwd, env: { HOME: home } },
    );
    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(payload.content).toEqual([
      { type: "text", text: "from-project" },
    ]);
  });
});

describe("--config / -c flag", () => {
  it("reads Config from --config and ignores User Config", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-cwd-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(home, ".mcpx", "mcp.json"),
      JSON.stringify({
        mcpServers: { fromhome: { command: "true", description: "home" } },
      }),
    );
    const override = path.join(cwd, "override.json");
    await writeFile(
      override,
      JSON.stringify({
        mcpServers: { fromflag: { command: "true", description: "flag" } },
      }),
    );

    const result = await runMcpx(["--config", override, "server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(
      '[{"name":"fromflag","purpose":"flag"}]',
    );
  });

  it("--config wins over MCPX_CONFIG when both are set", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const fromEnv = path.join(dir, "env.json");
    const fromFlag = path.join(dir, "flag.json");
    await writeFile(
      fromEnv,
      JSON.stringify({
        mcpServers: { envserver: { command: "true", description: "env" } },
      }),
    );
    await writeFile(
      fromFlag,
      JSON.stringify({
        mcpServers: { flagserver: { command: "true", description: "flag" } },
      }),
    );

    const result = await runMcpx(["--config", fromFlag, "server", "list"], {
      mcpConfig: fromEnv,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"flagserver","purpose":"flag"}]',
    );
  });

  it("--config wins over Project Config when both apply", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-cwd-"));
    await mkdir(path.join(cwd, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(cwd, ".mcpx", "mcp.json"),
      JSON.stringify({
        mcpServers: { proj: { command: "true", description: "project" } },
      }),
    );
    const override = path.join(cwd, "flag.json");
    await writeFile(
      override,
      JSON.stringify({
        mcpServers: { flag: { command: "true", description: "flag" } },
      }),
    );

    const result = await runMcpx(["--config", override, "server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"flag","purpose":"flag"}]',
    );
  });

  it("accepts -c as an alias for --config", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { short: { command: "true", description: "short" } },
      }),
    );

    const result = await runMcpx(["-c", configPath, "server", "list"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"short","purpose":"short"}]',
    );
  });

  it("resolves relative --config against cwd", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-cwd-"));
    await writeFile(
      path.join(cwd, "rel.json"),
      JSON.stringify({
        mcpServers: { rel: { command: "true", description: "relative" } },
      }),
    );

    const result = await runMcpx(["--config", "./rel.json", "server", "list"], {
      cwd,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"rel","purpose":"relative"}]',
    );
  });

  it("expands leading tilde in --config", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    await writeFile(
      path.join(home, "tilde-flag.json"),
      JSON.stringify({
        mcpServers: { t: { command: "true", description: "tilde-flag" } },
      }),
    );

    const result = await runMcpx(
      ["--config", "~/tilde-flag.json", "server", "list"],
      { env: { HOME: home } },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"t","purpose":"tilde-flag"}]',
    );
  });

  it("expands leading tilde in MCPX_CONFIG", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const configPath = path.join(home, "tilde-env.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { t: { command: "true", description: "tilde-env" } },
      }),
    );

    const result = await runMcpx(["server", "list"], {
      mcpConfig: "~/tilde-env.json",
      env: { HOME: home },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      '[{"name":"t","purpose":"tilde-env"}]',
    );
  });

  it("fails when --config points at an existing directory", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "mcpx-home-"));
    const cwd = await mkdtemp(path.join(os.tmpdir(), "mcpx-cwd-"));
    const dirPath = await mkdtemp(path.join(os.tmpdir(), "mcpx-as-dir-"));
    await mkdir(path.join(home, ".mcpx"), { recursive: true });
    await writeFile(
      path.join(home, ".mcpx", "mcp.json"),
      JSON.stringify({
        mcpServers: { fromhome: { command: "true", description: "home" } },
      }),
    );

    const result = await runMcpx(["--config", dirPath, "server", "list"], {
      cwd,
      env: { HOME: home },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/directory/i);
    expect(result.stderr).toMatch(/expected a file/i);
    expect(result.stdout).toBe("");
  });

  it("missing --config file yields Empty Config on server list", async () => {
    const missing = path.join(
      os.tmpdir(),
      `mcpx-missing-${Date.now()}`,
      "mcp.json",
    );
    const result = await runMcpx(["--config", missing, "server", "list"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe("[]");
  });

  it("server add writes to --config path", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const nested = path.join(dir, "nested", "override.json");

    const add = await runMcpx([
      "--config",
      nested,
      "server",
      "add",
      "--name",
      "written",
      "--command",
      "true",
      "--description",
      "via-flag",
    ]);
    expect(add.exitCode).toBe(0);
    expect(add.stderr).toBe("");

    const onDisk = JSON.parse(await readFile(nested, "utf8")) as {
      mcpServers: Record<string, { command: string; description: string }>;
    };
    expect(onDisk.mcpServers.written).toEqual({
      command: "true",
      description: "via-flag",
    });

    const list = await runMcpx(["--config", nested, "server", "list"]);
    expect(list.exitCode).toBe(0);
    expect(list.stdout.trim()).toBe(
      '[{"name":"written","purpose":"via-flag"}]',
    );
  });

  it("server remove mutates the --config file", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          keep: { command: "true", description: "keep" },
          drop: { command: "true", description: "drop" },
        },
      }),
    );

    const remove = await runMcpx([
      "--config",
      configPath,
      "server",
      "remove",
      "drop",
    ]);
    expect(remove.exitCode).toBe(0);

    const list = await runMcpx(["--config", configPath, "server", "list"]);
    expect(list.exitCode).toBe(0);
    expect(list.stdout.trim()).toBe(
      '[{"name":"keep","purpose":"keep"}]',
    );
  });

  it("list-tools resolves Servers from --config", async () => {
    const fixturePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "fixtures/stub-mcp-server.mjs",
    );
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          stub: {
            command: process.execPath,
            args: [fixturePath],
          },
        },
      }),
    );

    const result = await runMcpx(
      ["--config", configPath, "list-tools", "-s", "stub"],
    );
    expect(result.exitCode).toBe(0);
    const tools = JSON.parse(result.stdout) as Array<{ name: string }>;
    expect(tools.some((t) => t.name === "echo")).toBe(true);
  });

  it("fails when MCPX_CONFIG points at an existing directory", async () => {
    const dirPath = await mkdtemp(path.join(os.tmpdir(), "mcpx-as-dir-"));
    const result = await runMcpx(["server", "list"], { mcpConfig: dirPath });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/directory/i);
    expect(result.stderr).toMatch(/expected a file/i);
    expect(result.stdout).toBe("");
  });
});

describe("mcpx doctor (CLI wiring)", () => {
  let stub: StubHttpMcpHandle | undefined;

  afterEach(async () => {
    if (stub !== undefined) {
      await stub.close();
      stub = undefined;
    }
  });

  it("empty Config prints ok report and exits 0", async () => {
    const result = await runMcpx(["doctor"], {
      mcpConfig: "/tmp/mcpx-doctor-missing/mcp.json",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      configPath: string;
      servers: unknown[];
    };
    expect(report.ok).toBe(true);
    expect(report.servers).toEqual([]);
    expect(report.configPath).toContain("mcp.json");
  });

  it("unknown -s exits 1 with stderr and no report body", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(configPath, JSON.stringify({ mcpServers: {} }));
    const result = await runMcpx(["doctor", "-s", "missing"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/unknown name/i);
    expect(result.stdout).toBe("");
  });

  it("invalid --timeout exits 1", async () => {
    const result = await runMcpx(["doctor", "--timeout", "10"], {
      mcpConfig: "/tmp/mcpx-doctor-to/mcp.json",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/timeout/i);
    expect(result.stdout).toBe("");
  });

  it("shape_error yields ok false, exit 1, empty stderr", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { bad: { description: "no transport" } },
      }),
    );
    const result = await runMcpx(["doctor"], { mcpConfig: configPath });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      servers: Array<{ name: string; status: string }>;
    };
    expect(report.ok).toBe(false);
    expect(report.servers).toEqual([
      expect.objectContaining({ name: "bad", status: "shape_error" }),
    ]);
  });

  it("Probe success against stub HTTP exits 0", async () => {
    stub = await startStubHttpMcp();
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: { httpstub: { url: stub.url } },
      }),
    );
    const result = await runMcpx(["doctor", "-s", "httpstub"], {
      mcpConfig: configPath,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      servers: Array<{ status: string }>;
    };
    expect(report.ok).toBe(true);
    expect(report.servers).toEqual([{ name: "httpstub", status: "ok" }]);
  });

  it("mixed shape ok and Probe ok yields ok false, empty stderr", async () => {
    stub = await startStubHttpMcp();
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    await writeFile(
      configPath,
      JSON.stringify({
        mcpServers: {
          httpstub: { url: stub.url },
          bad: { description: "no transport" },
        },
      }),
    );
    const result = await runMcpx(["doctor"], { mcpConfig: configPath });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      servers: Array<{ name: string; status: string }>;
    };
    expect(report.ok).toBe(false);
    const byName = Object.fromEntries(
      report.servers.map((s) => [s.name, s.status]),
    );
    expect(byName.httpstub).toBe("ok");
    expect(byName.bad).toBe("shape_error");
  });

  it("server add rejects non-http URL (shared shape)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcpx-"));
    const configPath = path.join(dir, "mcp.json");
    const add = await runMcpx(
      ["server", "add", "--name", "ftp", "--url", "ftp://example.com/x"],
      { mcpConfig: configPath },
    );
    expect(add.exitCode).not.toBe(0);
    expect(add.stderr).toMatch(/http/i);
    expect(add.stdout).toBe("");
  });
});
