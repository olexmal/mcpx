/**
 * Output conventions (agent-first):
 * - Compact JSON on stdout by default
 * - Pretty JSON when `--pretty` is set, or when stdout is a TTY
 * - Errors → stderr + non-zero exit
 */
export type WriteJsonOptions = {
  pretty?: boolean;
  stdoutIsTTY?: boolean;
};

export function shouldPretty(
  options: WriteJsonOptions,
): boolean {
  if (options.pretty === true) {
    return true;
  }
  return options.stdoutIsTTY === true;
}

export function formatJson(value: unknown, pretty: boolean): string {
  return pretty ? `${JSON.stringify(value, null, 2)}\n` : `${JSON.stringify(value)}\n`;
}

export function writeJson(
  value: unknown,
  options: WriteJsonOptions = {},
): void {
  const pretty = shouldPretty({
    pretty: options.pretty,
    stdoutIsTTY: options.stdoutIsTTY ?? process.stdout.isTTY === true,
  });
  process.stdout.write(formatJson(value, pretty));
}

export function writeError(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
