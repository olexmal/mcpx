/**
 * Config shape + Probe diagnostic (`mcpx doctor`).
 */
import {
  assertValidServerEntry,
  type ServerConfig,
} from "./config.js";

export type DoctorStatus = "ok" | "shape_error" | "probe_error";

export type DoctorServerResult = {
  name: string;
  status: DoctorStatus;
  error?: string;
  hint?: string;
};

export type DoctorReport = {
  ok: boolean;
  configPath: string;
  servers: DoctorServerResult[];
};

export type ProbeFn = (
  entry: ServerConfig,
  timeoutMs: number,
) => Promise<void>;

const SSE_HINT =
  "Response looks like SSE; mcpx v1 expects Streamable HTTP.";

/** Best-effort SSE classification from a Probe failure message. */
export function sseHintFromProbeError(error: unknown): string | undefined {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    /text\/event-stream/i.test(msg) ||
    /\/sse\b/i.test(msg) ||
    /legacy\s+sse/i.test(msg)
  ) {
    return SSE_HINT;
  }
  return undefined;
}

export type RunDoctorOptions = {
  configPath: string;
  servers: Record<string, ServerConfig>;
  serverFilter?: string;
  timeoutMs: number;
  probe: ProbeFn;
};

export async function runDoctor(
  options: RunDoctorOptions,
): Promise<DoctorReport> {
  const { configPath, servers, serverFilter, timeoutMs, probe } = options;

  let targets: Array<[string, ServerConfig]>;
  if (serverFilter !== undefined) {
    if (!Object.prototype.hasOwnProperty.call(servers, serverFilter)) {
      throw new Error(`Server not found (unknown name): ${serverFilter}`);
    }
    targets = [[serverFilter, servers[serverFilter]!]];
  } else {
    targets = Object.entries(servers);
  }

  const results: DoctorServerResult[] = [];

  for (const [name, entry] of targets) {
    try {
      assertValidServerEntry(entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ name, status: "shape_error", error: message });
      continue;
    }

    try {
      await probe(entry, timeoutMs);
      results.push({ name, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const row: DoctorServerResult = {
        name,
        status: "probe_error",
        error: message,
      };
      const hint = sseHintFromProbeError(err);
      if (hint !== undefined) {
        row.hint = hint;
      }
      results.push(row);
    }
  }

  return {
    ok: results.every((r) => r.status === "ok"),
    configPath,
    servers: results,
  };
}
