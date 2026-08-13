import { discoverFiles } from "../../../discovery/files.js";
import { domainForToken, tokenizeRelativePath } from "../shared/index.js";
import type { DomainDiscoveryOptions, DomainDiscoveryResult, DomainMatch } from "../types/index.js";

function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Score a domain from evidence count and token hit density.
 * Deterministic; no LLM.
 */
export function scoreDomainConfidence(options: {
  evidenceCount: number;
  tokenHits: number;
}): number {
  const { evidenceCount, tokenHits } = options;
  if (evidenceCount <= 0) {
    return 0;
  }
  // Base rises with distinct files; bonus for repeated token hits in those files.
  const base = 0.45 + Math.min(evidenceCount, 8) * 0.06;
  const densityBonus = Math.min(tokenHits / Math.max(evidenceCount, 1), 3) * 0.05;
  return clampConfidence(base + densityBonus);
}

/**
 * Discover coarse product domains from repository path/filename heuristics.
 * Isolated from scan — call explicitly via the understanding API.
 */
export async function discoverDomains(
  options: DomainDiscoveryOptions = {},
): Promise<DomainDiscoveryResult> {
  const started = performance.now();
  const cwd = options.cwd ?? process.cwd();
  const minConfidence = options.minConfidence ?? 0.5;
  const minEvidence = options.minEvidence ?? 1;

  const discovery = await discoverFiles({ root: cwd });

  const byDomain = new Map<string, { evidence: Set<string>; tokenHits: number }>();

  for (const file of discovery.files) {
    const tokens = tokenizeRelativePath(file.relativePath);
    if (tokens.length === 0) {
      continue;
    }

    const matchedDomains = new Set<string>();
    for (const token of tokens) {
      const domain = domainForToken(token);
      if (!domain) {
        continue;
      }
      matchedDomains.add(domain);
      const bucket = byDomain.get(domain) ?? { evidence: new Set<string>(), tokenHits: 0 };
      bucket.tokenHits += 1;
      byDomain.set(domain, bucket);
    }

    for (const domain of matchedDomains) {
      const bucket = byDomain.get(domain);
      if (!bucket) {
        continue;
      }
      bucket.evidence.add(file.relativePath);
    }
  }

  const domains: DomainMatch[] = [];
  for (const [name, bucket] of byDomain) {
    if (bucket.evidence.size < minEvidence) {
      continue;
    }
    const confidence = scoreDomainConfidence({
      evidenceCount: bucket.evidence.size,
      tokenHits: bucket.tokenHits,
    });
    if (confidence < minConfidence) {
      continue;
    }
    domains.push({
      name,
      confidence,
      evidence: [...bucket.evidence].sort((a, b) => a.localeCompare(b)),
    });
  }

  domains.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    domains,
    timingMs: Math.round(performance.now() - started),
    filesConsidered: discovery.files.length,
  };
}
