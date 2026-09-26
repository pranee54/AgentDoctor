import { getBrainStatus } from "../../core/brain-cli/service.js";
import { buildProjectDna } from "../../product/dna/build.js";
import { analyzeDependencies } from "../../product/deps/analyze.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ChatTurnResponse } from "./types.js";
import type { ContextBundle } from "../context/types.js";
import { retrieveProjectContext } from "../context/retrieve.js";
import { buildChatTurnResponse } from "./response.js";

const ARCH_RE =
  /architecture|structure|module|layout|how.*(project|repo|codebase)|explain.*(project|repo|codebase|this)|what (is|does) (this|my) project|project overview|understand (my |this )?project/i;
const AUTH_RE = /auth|login|password|session|jwt|oauth/i;
const DEPS_RE = /depend|package|lockfile|npm|yarn|pnpm/i;
const START_RE = /where.*(start|entry|boot|main)|application start|entry\s*point/i;
const DB_RE = /database|db\.|sql|prisma|query\(/i;

export async function answerDeterministicProjectQuestion(options: {
  root: string;
  question: string;
  sessionId: string;
}): Promise<ChatTurnResponse> {
  const root = resolveRepoRoot(options.root);
  const q = options.question.trim();

  const context = await retrieveProjectContext({
    root,
    query: q,
    budgetTokens: 4_000,
  });

  const sections: string[] = [
    "Deterministic project answer (no LLM). Evidence from DNA, graph, brain, and dependency analyzers.",
    "",
  ];

  const dna = await buildProjectDna(root);
  sections.push(`[VERIFIED] Project: ${dna.name}`);
  sections.push(`Languages: ${dna.languages.join(", ") || "UNKNOWN"}`);
  sections.push(`Frameworks: ${dna.frameworks.join(", ") || "UNKNOWN"}`);
  sections.push(`Monorepo: ${dna.monorepo.isMonorepo ? dna.monorepo.tool : "no"}`);
  sections.push("");

  if (AUTH_RE.test(q)) {
    const authFiles = context.citations
      .filter((c) => c.path && /auth|login|session|password/i.test(c.path))
      .slice(0, 8);
    sections.push("[INFERRED] Authentication-related paths from retrieval:");
    if (authFiles.length) {
      for (const c of authFiles) {
        sections.push(`  - ${c.path} (${c.confidence})`);
      }
    } else {
      try {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const paths = [
          ...new Set(
            graph.nodes
              .map((n) => n.path)
              .filter(
                (p): p is string => typeof p === "string" && /auth|login|session|password/i.test(p),
              ),
          ),
        ].slice(0, 8);
        if (paths.length) {
          for (const p of paths) {
            sections.push(`  - ${p} (INFERRED from graph)`);
          }
        } else {
          sections.push("  UNKNOWN — no auth paths matched; scan src/**/auth* or routes manually.");
        }
      } catch {
        sections.push("  UNKNOWN — no auth paths matched; scan src/**/auth* or routes manually.");
      }
    }
    sections.push("");
  }

  if (START_RE.test(q)) {
    const startHits = context.citations
      .filter((c) => c.path && /(server|index|main|app)\.[jt]sx?$/i.test(c.path))
      .slice(0, 6);
    sections.push("[INFERRED] Likely entry-related paths:");
    if (startHits.length) {
      for (const c of startHits) {
        sections.push(`  - ${c.path} (${c.confidence})`);
      }
    } else {
      try {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const paths = [
          ...new Set(
            graph.nodes
              .map((n) => n.path)
              .filter(
                (p): p is string =>
                  typeof p === "string" && /(server|index|main|app)\.[jt]sx?$/i.test(p),
              ),
          ),
        ].slice(0, 6);
        if (paths.length) {
          for (const p of paths) sections.push(`  - ${p} (INFERRED from graph)`);
        } else {
          sections.push("  UNKNOWN — no clear entrypoint path in graph.");
        }
      } catch {
        sections.push("  UNKNOWN — no clear entrypoint path in graph.");
      }
    }
    sections.push("");
  }

  if (DB_RE.test(q)) {
    const dbHits = context.citations
      .filter((c) => c.path && /(db|database|prisma|sql|migration)/i.test(c.path))
      .slice(0, 6);
    sections.push("[INFERRED] Database-related paths:");
    if (dbHits.length) {
      for (const c of dbHits) sections.push(`  - ${c.path} (${c.confidence})`);
    } else {
      try {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const paths = [
          ...new Set(
            graph.nodes
              .map((n) => n.path)
              .filter(
                (p): p is string => typeof p === "string" && /(db|database|prisma|sql)/i.test(p),
              ),
          ),
        ].slice(0, 6);
        if (paths.length) {
          for (const p of paths) sections.push(`  - ${p} (INFERRED from graph)`);
        } else {
          sections.push("  UNKNOWN — no database path markers in graph.");
        }
      } catch {
        sections.push("  UNKNOWN — no database path markers in graph.");
      }
    }
    sections.push("");
  }

  if (DEPS_RE.test(q)) {
    const deps = await analyzeDependencies(root);
    sections.push("[VERIFIED] Direct dependencies (sample):");
    for (const d of deps.directDependencies.slice(0, 12)) {
      sections.push(`  - ${d.name} ${d.versionRange} (${d.packageJsonPath})`);
    }
    if (deps.transitiveFromLockfile?.length) {
      sections.push("[VERIFIED] Transitive versions from lockfile (sample):");
      for (const t of deps.transitiveFromLockfile.slice(0, 12)) {
        sections.push(`  - ${t.name}@${t.version}`);
      }
    }
    sections.push(`Lockfiles: ${deps.lockfilesPresent.join(", ") || "none"}`);
    sections.push("");
  }

  if (ARCH_RE.test(q)) {
    try {
      const graph = await buildIntelligenceGraph({ root, mode: "auto" });
      sections.push(
        `[INFERRED] Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges (${graph.builder})`,
      );
      const sample = graph.nodes.filter((n) => n.path).slice(0, 6);
      for (const n of sample) {
        sections.push(`  - ${n.kind}: ${n.label}${n.path ? ` @ ${n.path}` : ""}`);
      }
    } catch {
      sections.push("[UNKNOWN] Intelligence graph build failed.");
    }
    sections.push("");
  }

  const brain = await getBrainStatus(root);
  if (brain.hasSnapshot) {
    sections.push(
      `[INFERRED] Project brain snapshot present (${brain.snapshotCount} stored; latest ${brain.latestSnapshotId ?? "unknown"}).`,
    );
  } else {
    sections.push("[UNKNOWN] No project brain snapshot — run brain compile for richer answers.");
  }

  sections.push("");
  sections.push(
    "Limitations: deterministic answers cannot invent behavior not present in evidence.",
  );

  const bundle: ContextBundle = {
    ...context,
    limitations: [
      ...context.limitations,
      "Deterministic chat mode — no LLM; answers are template + local analyzers only.",
    ],
  };

  return buildChatTurnResponse({
    sessionId: options.sessionId,
    modelText: sections.join("\n"),
    context: bundle,
    provider: "deterministic",
    model: "local-analyzers",
    status: "ok",
  });
}
