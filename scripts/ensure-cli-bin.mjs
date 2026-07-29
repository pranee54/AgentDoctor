import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "dist", "cli", "index.js");
const binDir = path.join(root, "node_modules", ".bin");
const linkPath = path.join(binDir, "agentdoctor");

if (!fs.existsSync(target)) {
  process.exit(0);
}

fs.chmodSync(target, 0o755);
fs.mkdirSync(binDir, { recursive: true });

try {
  fs.rmSync(linkPath, { force: true });
} catch {
  // ignore
}

const relativeTarget = path.relative(binDir, target).split(path.sep).join("/");
const importPath = relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
const shim = `#!/usr/bin/env node\nimport ${JSON.stringify(importPath)};\n`;
fs.writeFileSync(linkPath, shim, { mode: 0o755 });
