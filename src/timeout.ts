/**
 * Probe timeout: `Ns` or `Nms` only (suffix required).
 * Returns milliseconds.
 */
export function parseTimeout(raw: string): number {
  const match = /^(\d+)(ms|s)$/.exec(raw);
  if (match === null) {
    throw new Error(
      `Invalid --timeout '${raw}': use Ns or Nms (e.g. 10s, 500ms)`,
    );
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      `Invalid --timeout '${raw}': duration must be greater than 0`,
    );
  }
  return unit === "s" ? amount * 1000 : amount;
}
