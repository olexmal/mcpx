import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const cliPath = path.join(root, "dist", "cli.js");

export type RunResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

export async function runMcpx(
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    /** When set, forces MCPX_CONFIG. When omitted, MCPX_CONFIG is cleared so default resolution applies. */
    mcpConfig?: string;
    /** Working directory for the CLI process (default: repo root). */
    cwd?: string;
  } = {},
): Promise<RunResult> {
  const env: NodeJS.ProcessEnv = { ...process.env, ...options.env };
  // Isolate from the parent shell: only mcpConfig opts into an override.
  delete env.MCPX_CONFIG;
  if (options.mcpConfig !== undefined) {
    env.MCPX_CONFIG = options.mcpConfig;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env,
      cwd: options.cwd ?? root,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}
