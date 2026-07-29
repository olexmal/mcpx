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
    mcpConfig?: string;
  } = {},
): Promise<RunResult> {
  const env: NodeJS.ProcessEnv = { ...process.env, ...options.env };
  if (options.mcpConfig !== undefined) {
    env.MCPX_CONFIG = options.mcpConfig;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env,
      cwd: root,
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
