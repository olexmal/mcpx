#!/usr/bin/env node
/**
 * Build destination-shaped Agent Guide zip for GitHub Releases.
 *
 * Source:  agent-guide/
 * Output:  dist-agent-guide/mcpx-agent-guide-<version>.zip
 *
 * Version: MCPX_PACK_VERSION env, else package.json "version".
 * Uses Python's zipfile (stdlib) so no OS `zip` binary is required.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "agent-guide");
const stagingRoot = path.join(root, "dist-agent-guide");
const staging = path.join(stagingRoot, "staging");

const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const version = (
  process.env.MCPX_PACK_VERSION?.replace(/^v/, "") || pkg.version
).trim();
if (!version) {
  console.error("Missing version (package.json or MCPX_PACK_VERSION)");
  process.exit(1);
}

const zipName = `mcpx-agent-guide-${version}.zip`;
const zipPath = path.join(stagingRoot, zipName);

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(from, to) {
  mkdirp(path.dirname(to));
  fs.copyFileSync(from, to);
}

const required = [
  path.join(src, "README.md"),
  path.join(src, "AGENT_GUIDE.md"),
  path.join(src, "adapters", "cursor", "mcpx.mdc"),
  path.join(src, "adapters", "AGENTS.mcpx.md"),
];
for (const f of required) {
  if (!fs.existsSync(f)) {
    console.error(`Missing source file: ${f}`);
    process.exit(1);
  }
}

rmrf(stagingRoot);
mkdirp(staging);

// Destination-shaped layout (ADR 0001)
copyFile(path.join(src, "README.md"), path.join(staging, "README.md"));
copyFile(
  path.join(src, "AGENT_GUIDE.md"),
  path.join(staging, "mcpx", "AGENT_GUIDE.md"),
);
copyFile(
  path.join(src, "adapters", "cursor", "mcpx.mdc"),
  path.join(staging, ".cursor", "rules", "mcpx.mdc"),
);
copyFile(
  path.join(src, "adapters", "AGENTS.mcpx.md"),
  path.join(staging, "AGENTS.mcpx.md"),
);

const py = `
import os, zipfile, sys
staging, zip_path = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, _dirs, files in os.walk(staging):
        for name in files:
            if name == ".DS_Store":
                continue
            full = os.path.join(root, name)
            arc = os.path.relpath(full, staging).replace(os.sep, "/")
            zf.write(full, arc)
`;

const result = spawnSync(
  "python3",
  ["-c", py, staging, zipPath],
  { encoding: "utf8" },
);
if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "python zip failed");
  process.exit(result.status ?? 1);
}

rmrf(staging);
console.log(zipPath);
