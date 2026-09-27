import { getBrainStatus } from "../../core/brain-cli/service.js";
import { buildProjectDna } from "../../product/dna/build.js";
import { analyzeDependencies } from "../../product/deps/analyze.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ChatTurnResponse } from "./types.js";
import type { ContextBundle } from "../context/types.js";
import { retrieveProjectContext } from "../context/retrieve.js";
import { extractQueryTerms } from "../context/brain-evidence.js";
import { buildChatTurnResponse } from "./response.js";
import { noopAskProgress, type AskProgressReporter } from "../progress.js";

const ARCH_RE =
  /architecture|structure|module|layout|what (is|does) (this|my) project|project overview|understand (my |this )?project/i;
const AUTH_RE = /auth|login|password|session|jwt|oauth/i;
const DEPS_RE = /depend|package|lockfile|npm|yarn|pnpm/i;
const DB_RE = /database|db\.|sql|prisma|query\(/i;
const MODULE_RE = /\bmodule\b|\bcomponent\b|\bprovides?\b|\bbelong/i;

/** ReDoS-safe: avoid `where.*…` / `how.*…` backtracking on uncontrolled chat input. */
function isStartQuestion(q: string): boolean {
  if (/application start|entry\s*point/i.test(q)) return true;
  const lower = q.toLowerCase();
  if (!lower.includes("where")) return false;
  return /\b(start|entry|boot|main)\b/i.test(q);
}

function isArchitectureQuestion(q: string): boolean {
  if (ARCH_RE.test(q)) return true;
  const lower = q.toLowerCase();
  if (lower.includes("how") && /(?:project|repo|codebase)/i.test(q)) return true;
  if (lower.includes("explain") && /(?:project|repo|codebase|\bthis\b)/i.test(q)) return true;
  return false;
}

function isModuleQuestion(q: string): boolean {
  return MODULE_RE.test(q) || extractQueryTerms(q).length > 0;
}

export async function answerDeterministicProjectQuestion(options: {
  root: string;
  question: string;
  sessionId: string;
  progress?: AskProgressReporter;
}): Promise<ChatTurnResponse> {
  const root = resolveRepoRoot(options.root);
  const q = options.question.trim();
  const progress = options.progress ?? noopAskProgress;

  progress.stage("understand", "start");
  const terms = extractQueryTerms(q);
  progress.stage(
    "understand",
    "ok",
    terms.length ? `focus: ${terms.slice(0, 4).join(", ")}` : undefined,
  );

  const context = await retrieveProjectContext({
    root,
    query: q,
    budgetTokens: 4_000,
    maxSourceFiles: 8,
    progress,
  });

  progress.stage("prepare", "start");
  try {
    const response = await buildDeterministicAnswer({
      root,
      q,
      terms,
      context,
      sessionId: options.sessionId,
    });
    progress.stage("prepare", "ok");
    return response;
  } catch (error) {
    progress.stage("prepare", "fail", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function buildDeterministicAnswer(options: {
  root: string;
  q: string;
  terms: string[];
  context: ContextBundle;
  sessionId: string;
}): Promise<ChatTurnResponse> {
  const { root, q, terms, context, sessionId } = options;

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

  const brainCitations = context.citations.filter(
    (c) => c.source === "brain" || c.evidenceType === "project-brain",
  );
  const sourceCitations = context.citations.filter(
    (c) => c.confidence === "VERIFIED" && c.evidenceType === "source-code" && c.path,
  );

  if (brainCitations.length > 0 && (isModuleQuestion(q) || isArchitectureQuestion(q))) {
    const focus = terms.length ? terms.join(", ") : "project";
    sections.push(`[INFERRED] Project Brain evidence for: ${focus}`);
    for (const c of brainCitations.slice(0, 14)) {
      sections.push(`  - ${c.excerpt ?? c.note ?? "brain claim"}`);
    }
    sections.push("");
    if (sourceCitations.length) {
      sections.push("[VERIFIED] Owned source paths linked from Brain / retrieval:");
      for (const c of sourceCitations.slice(0, 10)) {
        sections.push(`  - ${c.path}`);
      }
      sections.push("");
    } else {
      sections.push(
        "[INFERRED] No owned source excerpts resolved for these Brain claims; structural evidence only.",
      );
      sections.push("");
    }
  }

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

  if (isStartQuestion(q)) {
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

  if (isArchitectureQuestion(q) && brainCitations.length === 0) {
    try {
      const graph = await buildIntelligenceGraph({ root, mode: "auto" });
      sections.push(
        `[INFERRED] Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges (${graph.builder})`,
      );
      const termLower = terms.map((t) => t.toLowerCase());
      const filtered = graph.nodes
        .filter((n) => n.path && n.label)
        .filter((n) => {
          if (/\.min\.js$/i.test(n.path!) || /chart\.umd|node_modules/i.test(n.path!)) return false;
          if (termLower.length === 0) return n.kind === "file" || n.kind === "module";
          const blob = `${n.label} ${n.path}`.toLowerCase();
          return termLower.some((t) => blob.includes(t));
        })
        .slice(0, 8);
      const sample = filtered.length
        ? filtered
        : graph.nodes
            .filter((n) => n.path && !/\.min\.js$/i.test(n.path))
            .filter((n) => n.kind === "file")
            .slice(0, 6);
      for (const n of sample) {
        sections.push(`  - ${n.kind}: ${n.label}${n.path ? ` @ ${n.path}` : ""}`);
      }
    } catch {
      sections.push("[UNKNOWN] Intelligence graph build failed.");
    }
    sections.push("");
  } else if (isArchitectureQuestion(q)) {
    // Brain already rendered; add a short graph filter if present in context.
    const graphCite = context.citations.find((c) => c.source === "graph");
    if (graphCite?.excerpt) {
      sections.push("[INFERRED] Query-filtered graph nodes:");
      for (const line of graphCite.excerpt.split("\n").slice(0, 6)) {
        sections.push(`  - ${line}`);
      }
      sections.push("");
    }
  }

  const brain = await getBrainStatus(root);
  if (brain.hasSnapshot) {
    sections.push(
      `[INFERRED] Project brain snapshot present (${brain.snapshotCount} stored; latest ${brain.latestSnapshotId ?? "unknown"}).`,
    );
  } else {
    sections.push("[UNKNOWN] No project brain snapshot — run brain compile for richer answers.");
  }

  if (
    brainCitations.length === 0 &&
    sourceCitations.length === 0 &&
    !AUTH_RE.test(q) &&
    !DEPS_RE.test(q) &&
    !isArchitectureQuestion(q)
  ) {
    sections.push("");
    sections.push(
      "[UNKNOWN] Insufficient Brain/source evidence for this question — try a more specific module or path name.",
    );
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
    sessionId,
    modelText: sections.join("\n"),
    context: bundle,
    provider: "deterministic",
    model: "local-analyzers",
    status: "ok",
  });
}
