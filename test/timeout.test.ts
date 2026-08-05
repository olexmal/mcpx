import { describe, expect, it } from "vitest";
import { parseTimeout } from "../src/timeout.js";

describe("parseTimeout", () => {
  it("parses seconds", () => {
    expect(parseTimeout("10s")).toBe(10_000);
  });

  it("parses milliseconds", () => {
    expect(parseTimeout("500ms")).toBe(500);
  });

  it("parses 1s", () => {
    expect(parseTimeout("1s")).toBe(1_000);
  });

  it("rejects bare integer", () => {
    expect(() => parseTimeout("10")).toThrow(/timeout/i);
  });

  it("rejects minutes", () => {
    expect(() => parseTimeout("1m")).toThrow(/timeout/i);
  });

  it("rejects zero seconds", () => {
    expect(() => parseTimeout("0s")).toThrow(/timeout/i);
  });

  it("rejects zero milliseconds", () => {
    expect(() => parseTimeout("0ms")).toThrow(/timeout/i);
  });

  it("rejects negative", () => {
    expect(() => parseTimeout("-5s")).toThrow(/timeout/i);
  });

  it("rejects empty string", () => {
    expect(() => parseTimeout("")).toThrow(/timeout/i);
  });

  it("rejects unknown suffix", () => {
    expect(() => parseTimeout("10sec")).toThrow(/timeout/i);
  });
});
