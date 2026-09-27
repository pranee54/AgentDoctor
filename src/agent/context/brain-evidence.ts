import path from "node:path";

import { loadLatestBrain, searchBrain, type BrainSearchHit } from "../../core/brain-cli/service.js";
import type { ProjectBrain } from "../../core/understanding/brain/index.js";
import type { ContextCitation } from "./types.js";

const QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "where",
  "when",
  "why",
  "how",
  "does",
  "do",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "of",
  "to",
  "for",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "about",
  "into",
  "this",
  "that",
  "these",
  "those",
  "my",
  "our",
  "your",
  "its",
  "project",
  "projects",
  "module",
  "modules",
  "component",
  "components",
  "belong",
  "belongs",
  "provide",
  "provides",
  "explain",
  "architecture",
  "structure",
  "overview",
  "system",
  "please",
  "tell",
  "me",
  "describe",
]);

const PATHISH =
  /(?:^|[\s(])((?:[\w.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|php|go|rs|java|kt|dart|rb|cs|md|json|yml|yaml|toml))(?:$|[\s),:;])/i;

function scoreBrainHitText(text: string, kind: BrainSearchHit["kind"]): number {
  let score = 0;
  if (/PROVIDES|CONTAINS/i.test(text)) score += 0.45;
  if (/\bmodule\b/i.test(text) || kind === "component") score += 0.25;
  if (/is-domain/i.test(text)) score += 0.1;
  if (/has-risk/i.test(text)) score -= 0.35;
  if (/unclear-ownership/i.test(text)) score -= 0.15;
  return score;
}

/**
 * AgentDoctor control-plane under `.agentdoctor/**` — usable internally,
 * never as ordinary VERIFIED application source evidence.
 */
export function isControlPlaneRelativePath(relativePath: string): boolean {
  const norm = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return norm === ".agentdoctor" || norm.startsWith(".agentdoctor/");
}

/** Significant tokens from a natural-language project question. */
export function extractQueryTerms(query: string): string[] {
  const raw = query
    .split(/[^a-zA-Z0-9_./-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !QUERY_STOPWORDS.has(t.toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function looksLikeRepoRelativePath(locator: string): boolean {
  const n = locator.replace(/\\/g, "/");
  if (!n || n.includes("\0") || path.isAbsolute(n) || n.split("/").includes("..")) return false;
  if (isControlPlaneRelativePath(n)) return false;
  if (n.includes(".private/") || n.startsWith("AgentDoctorOS/")) return false;
  // Prefer file-like or directory module paths (contain a slash or extension).
  return n.includes("/") || /\.\w{1,8}$/.test(n);
}

function collectPathsFromHitText(text: string, into: Set<string>): void {
  let match: RegExpExecArray | null;
  const re = new RegExp(PATHISH.source, "gi");
  while ((match = re.exec(text)) !== null) {
    const p = match[1]?.replace(/\\/g, "/");
    if (p && looksLikeRepoRelativePath(p)) into.add(p);
  }
}

export interface BrainEvidencePack {
  brain: ProjectBrain | null;
  hits: BrainSearchHit[];
  citations: ContextCitation[];
  /** Owned-looking source paths derived from claims/components/evidence (not yet ownership-gated). */
  candidateSourcePaths: string[];
  limitations: string[];
}

/**
 * Search the latest usable Project Brain for query-relevant claims/components.
 * Brain hits are INFERRED structural evidence — never auto-upgraded to VERIFIED.
 * Stale ownership-boundary brains load as null (same as CLI brain status).
 */
export async function collectBrainEvidenceForQuery(
  root: string,
  query: string,
  options?: { maxHits?: number },
): Promise<BrainEvidencePack> {
  const maxHits = options?.maxHits ?? 24;
  const limitations: string[] = [];
  const brain = await loadLatestBrain(root);
  if (!brain) {
    return {
      brain: null,
      hits: [],
      citations: [],
      candidateSourcePaths: [],
      limitations: ["No usable project brain snapshot; brain evidence skipped."],
    };
  }

  const terms = extractQueryTerms(query);
  const hitMap = new Map<string, BrainSearchHit>();

  const absorb = (hits: BrainSearchHit[], boost = 0): void => {
    for (const h of hits) {
      const ranked: BrainSearchHit = {
        ...h,
        score: h.score + boost + scoreBrainHitText(h.text, h.kind),
      };
      const prev = hitMap.get(h.id);
      if (!prev || ranked.score > prev.score) hitMap.set(h.id, ranked);
    }
  };

  // Full query first (matches CLI `brain search`), then significant terms.
  absorb(searchBrain(brain, query), 0.3);
  for (const term of terms) {
    absorb(searchBrain(brain, term), 0.2);
  }

  // Architecture / overview with weak terms: surface top modules + provides/contains claims.
  if (terms.length === 0 || /architecture|structure|overview|explain (the )?project/i.test(query)) {
    const seenNames = new Set<string>();
    for (const c of brain.components) {
      if (c.type === "domain-surface") {
        const key = c.name.toLowerCase();
        if (seenNames.has(key)) continue;
        seenNames.add(key);
      }
      if (c.type !== "module" && c.type !== "domain-surface" && c.type !== "entrypoint") continue;
      const id = c.id;
      const score = c.type === "module" ? 0.85 : c.type === "entrypoint" ? 0.75 : 0.55;
      const prev = hitMap.get(id);
      if (!prev || score > prev.score) {
        hitMap.set(id, {
          kind: "component",
          id,
          text: `${c.name} (${c.type})`.slice(0, 240),
          score,
        });
      }
      if (hitMap.size >= maxHits * 2) break;
    }
    for (const claim of brain.claims) {
      if (!/PROVIDES|CONTAINS|is-domain/i.test(claim.predicate)) continue;
      const text = `${claim.subject} ${claim.predicate} ${claim.object}`;
      const score = /PROVIDES|CONTAINS/i.test(claim.predicate) ? 0.9 : 0.6;
      if (!hitMap.has(claim.id) || (hitMap.get(claim.id)?.score ?? 0) < score) {
        hitMap.set(claim.id, {
          kind: "claim",
          id: claim.id,
          text: text.slice(0, 240),
          score,
        });
      }
      if (hitMap.size >= maxHits * 3) break;
    }
  }

  const hitsRaw = [...hitMap.values()].sort(
    (a, b) => b.score - a.score || a.id.localeCompare(b.id),
  );
  // Collapse duplicate domain-surface/module labels (same name, many component ids).
  const hits: BrainSearchHit[] = [];
  const seenLabels = new Set<string>();
  for (const h of hitsRaw) {
    if (h.kind === "component") {
      const labelKey = h.text.replace(/^comp_[a-f0-9]+\s+/i, "").toLowerCase();
      if (seenLabels.has(labelKey)) continue;
      seenLabels.add(labelKey);
    }
    hits.push(h);
    if (hits.length >= maxHits) break;
  }

  const candidateSourcePaths = new Set<string>();
  const evidenceById = new Map(brain.evidence.map((e) => [e.id, e]));
  const componentById = new Map(brain.components.map((c) => [c.id, c]));
  const claimById = new Map(brain.claims.map((c) => [c.id, c]));

  for (const hit of hits) {
    collectPathsFromHitText(hit.text, candidateSourcePaths);
    if (hit.kind === "component") {
      const comp = componentById.get(hit.id);
      if (comp?.path && looksLikeRepoRelativePath(comp.path)) {
        candidateSourcePaths.add(comp.path.replace(/\\/g, "/"));
      }
      for (const eid of comp?.evidenceIds ?? []) {
        const ev = evidenceById.get(eid);
        if (
          ev &&
          (ev.kind === "path" || ev.kind === "file-presence") &&
          looksLikeRepoRelativePath(ev.locator)
        ) {
          candidateSourcePaths.add(ev.locator.replace(/\\/g, "/"));
        }
      }
    }
    if (hit.kind === "claim") {
      const claim = claimById.get(hit.id);
      for (const eid of claim?.evidenceIds ?? []) {
        const ev = evidenceById.get(eid);
        if (
          ev &&
          (ev.kind === "path" || ev.kind === "file-presence") &&
          looksLikeRepoRelativePath(ev.locator)
        ) {
          candidateSourcePaths.add(ev.locator.replace(/\\/g, "/"));
        }
      }
      // Subject/object may themselves be module directory paths.
      if (claim && looksLikeRepoRelativePath(claim.subject)) {
        candidateSourcePaths.add(claim.subject.replace(/\\/g, "/"));
      }
      if (claim && looksLikeRepoRelativePath(claim.object)) {
        candidateSourcePaths.add(claim.object.replace(/\\/g, "/"));
      }
    }
  }

  // Prefer source paths that match query terms (e.g. Proxyshield → proxyshield/...).
  // Deprioritize editor/control noise and has-risk-only paths when better options exist.
  const termLower = terms.map((t) => t.toLowerCase());
  const rankedPaths = [...candidateSourcePaths].sort((a, b) => {
    const score = (p: string): number => {
      let s = 0;
      const lower = p.toLowerCase();
      if (termLower.some((t) => lower.includes(t))) s += 5;
      if (/\.(php|ts|tsx|js|py)$/i.test(p)) s += 2;
      if (p.startsWith(".cursor/") || p.startsWith(".agentdoctor/")) s -= 6;
      if (/\.htaccess$/i.test(p)) s -= 1;
      return s;
    };
    return score(b) - score(a) || a.localeCompare(b);
  });

  const citations: ContextCitation[] = hits.map((h) => ({
    source: "brain" as const,
    evidenceType: "project-brain" as const,
    confidence: "INFERRED" as const,
    excerpt: h.text,
    note: `brain:${h.kind}:${h.id}`,
  }));

  if (hits.length === 0) {
    limitations.push("Project brain loaded but no claims/components matched this query.");
  }

  return {
    brain,
    hits,
    citations,
    candidateSourcePaths: rankedPaths.slice(0, 20),
    limitations,
  };
}
