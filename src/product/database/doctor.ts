import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import { lineNumberAt } from "../evidence-scan.js";

export interface SchemaObjectFinding {
  name: string;
  kind: "table" | "collection" | "model" | "unknown";
  source: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface SchemaDriftFinding {
  name: string;
  truth: TruthLabel;
  note: string;
  sources: string[];
}

export interface SchemaRelationFinding {
  from: string;
  to: string;
  kind: "prisma-relation" | "sql-reference";
  source: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface DatabaseDoctorReport {
  root: string;
  objects: SchemaObjectFinding[];
  relations: SchemaRelationFinding[];
  drift: SchemaDriftFinding[];
  limitations: string[];
}

function parseLaravelMigration(content: string, relativePath: string): SchemaObjectFinding[] {
  const out: SchemaObjectFinding[] = [];
  const createRe = /Schema::create\s*\(\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = createRe.exec(content)) !== null) {
    out.push({
      name: m[1]!,
      kind: "table",
      source: "laravel-migration",
      truth: "VERIFIED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, m.index),
          excerpt: m[0].slice(0, 120),
        },
      ],
    });
  }
  return out;
}

function parseSqlTables(content: string, relativePath: string): SchemaObjectFinding[] {
  const out: SchemaObjectFinding[] = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({
      name: m[1]!,
      kind: "table",
      source: "sql",
      truth: "VERIFIED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, m.index),
          excerpt: m[0].slice(0, 120),
        },
      ],
    });
  }
  return out;
}

function parsePrismaRelations(content: string, relativePath: string): SchemaRelationFinding[] {
  const out: SchemaRelationFinding[] = [];
  const modelBlocks = content.split(/^model\s+/gm).slice(1);
  for (const block of modelBlocks) {
    const modelName = /^(\w+)/.exec(block)?.[1];
    if (!modelName) continue;
    const relRe =
      /^\s+(\w+)\s+\w+\??\s+@relation\s*\(\s*fields:\s*\[[^\]]+\]\s*,\s*references:\s*\[[^\]]+\]\s*,\s*[^)]*?\)/gm;
    let m: RegExpExecArray | null;
    while ((m = relRe.exec(block)) !== null) {
      const field = m[1]!;
      out.push({
        from: `${modelName}.${field}`,
        to: "referenced-model",
        kind: "prisma-relation",
        source: "prisma",
        truth: "VERIFIED",
        evidence: [
          {
            path: relativePath,
            line: lineNumberAt(content, content.indexOf(m[0])),
            excerpt: m[0].trim().slice(0, 120),
          },
        ],
      });
    }
    const shorthand = /^\s+(\w+)\s+(\w+)\s+@relation/gm;
    while ((m = shorthand.exec(block)) !== null) {
      out.push({
        from: `${modelName}.${m[1]!}`,
        to: m[2]!,
        kind: "prisma-relation",
        source: "prisma",
        truth: "INFERRED",
        evidence: [{ path: relativePath, excerpt: m[0].trim() }],
      });
    }
  }
  return out;
}

function parseSqlReferences(content: string, relativePath: string): SchemaRelationFinding[] {
  const out: SchemaRelationFinding[] = [];
  const re =
    /FOREIGN\s+KEY\s*\(\s*[`"']?(\w+)[`"']?\s*\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(\s*[`"']?(\w+)[`"']?\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({
      from: m[1]!,
      to: `${m[2]!}.${m[3]!}`,
      kind: "sql-reference",
      source: "sql",
      truth: "VERIFIED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, m.index),
          excerpt: m[0].slice(0, 120),
        },
      ],
    });
  }
  return out;
}

function parsePrismaModels(content: string, relativePath: string): SchemaObjectFinding[] {
  const out: SchemaObjectFinding[] = [];
  const re = /^model\s+(\w+)\s*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({
      name: m[1]!,
      kind: "model",
      source: "prisma",
      truth: "VERIFIED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, m.index),
          excerpt: m[0].trim(),
        },
      ],
    });
  }
  return out;
}

function detectDrift(objects: SchemaObjectFinding[]): SchemaDriftFinding[] {
  const byName = new Map<string, SchemaObjectFinding[]>();
  for (const o of objects) {
    const key = o.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(o);
  }
  const drift: SchemaDriftFinding[] = [];
  for (const [name, group] of byName) {
    const sources = [...new Set(group.map((g) => g.source))];
    if (sources.length <= 1) continue;
    drift.push({
      name,
      truth: "UNKNOWN",
      note: "Same object name appears in multiple schema sources; manual reconciliation required.",
      sources,
    });
  }
  return drift.sort((a, b) => a.name.localeCompare(b.name));
}

export async function analyzeDatabaseSchema(
  rootInput: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<DatabaseDoctorReport> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const limitations = [
    "Schema extraction is pattern-based on migrations/SQL/Prisma; runtime DB state is not inspected.",
    "Drift is reported only when the same object name appears in disagreeing sources.",
  ];

  const objects: SchemaObjectFinding[] = [];
  const relations: SchemaRelationFinding[] = [];

  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    const lower = rel.toLowerCase();
    const abs = path.join(root, rel);
    const text = await readTextFile(abs, maxFileSizeBytes);
    if (text === null) continue;

    if (lower.endsWith(".sql")) {
      objects.push(...parseSqlTables(text, rel));
      relations.push(...parseSqlReferences(text, rel));
    } else if (lower.includes("database/migrations/") && lower.endsWith(".php")) {
      objects.push(...parseLaravelMigration(text, rel));
    } else if (lower.endsWith("schema.prisma") || lower.endsWith(".prisma")) {
      objects.push(...parsePrismaModels(text, rel));
      relations.push(...parsePrismaRelations(text, rel));
    }
  }

  const drift = detectDrift(objects);

  return { root, objects, relations, drift, limitations };
}
