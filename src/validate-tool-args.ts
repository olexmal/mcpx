/**
 * Validate call-tool --args against a Tool's MCP inputSchema (JSON Schema).
 * No network: remote $refs are not loaded.
 */
import { Ajv, type ErrorObject } from "ajv";
import addFormatsImport from "ajv-formats";

type FormatsPlugin = (ajv: Ajv) => Ajv;
const addFormats = addFormatsImport as unknown as FormatsPlugin;

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (errors === undefined || errors === null || errors.length === 0) {
    return "validation failed";
  }
  return errors
    .map((e) => {
      const path = e.instancePath === "" ? "/" : e.instancePath;
      return `${path} ${e.message ?? "invalid"}`.trim();
    })
    .join("; ");
}

/**
 * Throws if args do not match schema, or if schema is present but unusable.
 * Missing/null/non-object schema → no-op (any JSON object is allowed).
 */
export function assertArgsMatchInputSchema(
  args: Record<string, unknown>,
  inputSchema: unknown,
): void {
  if (inputSchema === undefined || inputSchema === null) {
    return;
  }
  if (typeof inputSchema !== "object" || Array.isArray(inputSchema)) {
    throw new Error("Unusable inputSchema: expected a JSON Schema object");
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false,
    // Never load remote schemas.
    loadSchema: undefined,
  });
  addFormats(ajv);

  let validate;
  try {
    validate = ajv.compile(inputSchema);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Unusable inputSchema: ${detail}`);
  }

  if (!validate(args)) {
    throw new Error(`Invalid --args: ${formatAjvErrors(validate.errors)}`);
  }
}
