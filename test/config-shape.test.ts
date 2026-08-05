import { describe, expect, it } from "vitest";
import {
  assertValidServerEntry,
  type ServerConfig,
} from "../src/config.js";

describe("assertValidServerEntry", () => {
  it("accepts stdio entry with command only", () => {
    expect(() =>
      assertValidServerEntry({ command: "node", args: ["server.js"] }),
    ).not.toThrow();
  });

  it("accepts HTTP entry with http URL", () => {
    expect(() =>
      assertValidServerEntry({ url: "http://127.0.0.1:3000/mcp" }),
    ).not.toThrow();
  });

  it("accepts HTTP entry with https URL", () => {
    expect(() =>
      assertValidServerEntry({ url: "https://example.com/mcp" }),
    ).not.toThrow();
  });

  it("rejects neither command nor url", () => {
    expect(() => assertValidServerEntry({ description: "x" })).toThrow(
      /command|url/i,
    );
  });

  it("rejects both command and url", () => {
    const entry: ServerConfig = {
      command: "node",
      url: "http://127.0.0.1:1/mcp",
    };
    expect(() => assertValidServerEntry(entry)).toThrow(/both|not have both/i);
  });

  it("rejects empty command string", () => {
    expect(() => assertValidServerEntry({ command: "" })).toThrow(/command/i);
  });

  it("rejects empty url string", () => {
    expect(() => assertValidServerEntry({ url: "" })).toThrow(/url/i);
  });

  it("rejects non-string args", () => {
    expect(() =>
      assertValidServerEntry({ command: "node", args: [1] as unknown as string[] }),
    ).toThrow(/args/i);
  });

  it("rejects args that are not an array", () => {
    expect(() =>
      assertValidServerEntry({
        command: "node",
        args: "x" as unknown as string[],
      }),
    ).toThrow(/args/i);
  });

  it("rejects env values that are not strings", () => {
    expect(() =>
      assertValidServerEntry({
        command: "node",
        env: { A: 1 } as unknown as Record<string, string>,
      }),
    ).toThrow(/env/i);
  });

  it("rejects headers that are not string maps", () => {
    expect(() =>
      assertValidServerEntry({
        url: "http://127.0.0.1:1/mcp",
        headers: { A: 1 } as unknown as Record<string, string>,
      }),
    ).toThrow(/headers/i);
  });

  it("rejects unparseable URL", () => {
    expect(() => assertValidServerEntry({ url: "not a url" })).toThrow(/url/i);
  });

  it("rejects non-http(s) URL schemes", () => {
    expect(() => assertValidServerEntry({ url: "ftp://example.com/x" })).toThrow(
      /http/i,
    );
  });
});
