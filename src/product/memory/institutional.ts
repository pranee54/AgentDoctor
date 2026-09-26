import { loadLatestBrain, searchBrain } from "../../core/brain-cli/service.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { buildProjectDna } from "../dna/build.js";
import { loadDecisionLedger } from "../decisions/ledger.js";
import { readChangeLedger } from "../ledger/change-ledger.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export interface MemoryHit {
  source: "brain" | "decisions" | "change-ledger" | "dna";
  id: string;
  title: string;
  excerpt: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface InstitutionalMemoryQueryResult {
  root: string;
  query: string;
  hits: MemoryHit[];
  limitations: string[];
}

export async function queryMemory(
  rootInput: string,
  query: string,
): Promise<InstitutionalMemoryQueryResult> {
  const root = resolveRepoRoot(rootInput);
  const q = query.trim();
  const limitations = [
    "Institutional memory merges repo-local Brain, ADR/decision ledger, change ledger, and DNA — not a vector DB.",
    "Ranking is substring match with simple scoring — not semantic search.",
    "Cross-repo memory is not supported; query is scoped to the resolved catalog root.",
  ];

  if (!q) {
    return { root, query: q, hits: [], limitations: [...limitations, "Empty query — no hits."] };
  }

  const hits: MemoryHit[] = [];
  const qLower = q.toLowerCase();

  const brain = await loadLatestBrain(root);
  if (brain) {
    for (const bh of searchBrain(brain, q).slice(0, 15)) {
      hits.push({
        source: "brain",
        id: bh.id,
        title: bh.kind,
        excerpt: bh.text.slice(0, 280),
        truth: "VERIFIED",
        evidence: [{ path: ".agentdoctor/project-brain", excerpt: bh.text.slice(0, 120) }],
      });
    }
  } else {
    limitations.push("No Project Brain snapshot — brain hits skipped.");
  }

  const decisions = await loadDecisionLedger(root);
  for (const d of decisions.decisions) {
    const hay = `${d.title} ${d.bodyExcerpt ?? ""}`.toLowerCase();
    if (!hay.includes(qLower)) continue;
    hits.push({
      source: "decisions",
      id: d.id,
      title: d.title,
      excerpt: (d.bodyExcerpt ?? d.title).slice(0, 280),
      truth: d.truth,
      evidence: d.evidence,
    });
  }

  const changeLedger = await readChangeLedger(root);
  for (const entry of changeLedger.entries) {
    const hay =
      `${entry.task ?? ""} ${entry.plan ?? ""} ${entry.note ?? ""} ${(entry.files ?? []).join(" ")}`.toLowerCase();
    if (!hay.includes(qLower)) continue;
    hits.push({
      source: "change-ledger",
      id: entry.id,
      title: entry.task ?? entry.id,
      excerpt: (entry.note ?? entry.plan ?? entry.task ?? "").slice(0, 280),
      truth: "VERIFIED",
      evidence: [{ path: ".agentdoctor/change-ledger/entries.jsonl", excerpt: entry.id }],
    });
  }

  const dna = await buildProjectDna(root);
  const dnaHay = JSON.stringify({
    name: dna.name,
    frameworks: dna.frameworks,
    languages: dna.languages,
    services: dna.services,
  }).toLowerCase();
  if (dnaHay.includes(qLower)) {
    hits.push({
      source: "dna",
      id: dna.fingerprint,
      title: `Project DNA: ${dna.name}`,
      excerpt: `Languages: ${dna.languages.join(", ")}; frameworks: ${dna.frameworks.join(", ")}`,
      truth: dna.truth,
      evidence: [{ path: ".agentdoctor/dna/project-dna.json", excerpt: dna.fingerprint }],
    });
  }

  hits.sort((a, b) => b.excerpt.length - a.excerpt.length);

  return {
    root,
    query: q,
    hits: hits.slice(0, 40),
    limitations,
  };
}
