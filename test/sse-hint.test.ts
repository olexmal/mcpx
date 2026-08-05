import { describe, expect, it } from "vitest";
import { sseHintFromProbeError } from "../src/doctor.js";

describe("sseHintFromProbeError", () => {
  it("returns hint when error mentions text/event-stream", () => {
    expect(
      sseHintFromProbeError(new Error("Unexpected content-type: text/event-stream")),
    ).toMatch(/Streamable HTTP/i);
  });

  it("returns hint when error mentions legacy SSE", () => {
    expect(sseHintFromProbeError(new Error("legacy SSE endpoint"))).toMatch(
      /Streamable HTTP/i,
    );
  });

  it("returns hint when error mentions /sse path", () => {
    expect(sseHintFromProbeError(new Error("GET /sse failed"))).toMatch(
      /Streamable HTTP/i,
    );
  });

  it("returns undefined for generic connection errors", () => {
    expect(sseHintFromProbeError(new Error("fetch failed"))).toBeUndefined();
  });

  it("does not hint on unrelated words containing sse", () => {
    expect(sseHintFromProbeError(new Error("asserted successfully"))).toBeUndefined();
  });

  it("accepts string errors", () => {
    expect(sseHintFromProbeError("text/event-stream")).toMatch(/Streamable HTTP/i);
  });
});
