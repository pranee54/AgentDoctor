import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ValidationReport } from "../types.js";
import { buildScientificFindings } from "./report.js";

const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const report = JSON.parse(
  fs.readFileSync(path.join(labRoot, "reports", "latest.json"), "utf8"),
) as ValidationReport;

const scientific = buildScientificFindings(report);
fs.writeFileSync(
  path.join(labRoot, "reports", "scientific-findings.json"),
  `${JSON.stringify(scientific, null, 2)}\n`,
);
console.log(JSON.stringify(scientific, null, 2));
