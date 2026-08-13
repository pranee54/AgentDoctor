import { formatConfidence } from "./summary.js";
import type { UnderstandSection, UnderstandSnapshot } from "./types.js";

function take<T>(items: readonly T[], maxItems: number): T[] {
  return items.slice(0, maxItems);
}

function bullet(lines: string[]): string[] {
  return lines.map((line) => `- ${line}`);
}

/**
 * Assemble a deterministic plain-text report from an UnderstandSnapshot.
 */
export function formatUnderstandReport(
  snapshot: UnderstandSnapshot,
  options: { maxItems: number },
): { text: string; sections: UnderstandSection[] } {
  const { maxItems } = options;
  const {
    repository,
    domains,
    entrypoints,
    architectures,
    dependencies,
    relationships,
    statistics,
  } = snapshot;

  const sections: UnderstandSection[] = [];

  sections.push({
    title: "Repository Overview",
    lines: [
      `Project: ${repository.projectName}`,
      `Schema: ${repository.schemaVersion}`,
      `Compiler: ${repository.compilerVersion}`,
      `Generated At: ${repository.generatedAt}`,
      `Frameworks: ${repository.frameworks.length > 0 ? repository.frameworks.join(", ") : "(none)"}`,
      `Top Domains: ${repository.topDomains.length > 0 ? repository.topDomains.join(", ") : "(none)"}`,
      `Top Architectures: ${
        repository.topArchitectures.length > 0 ? repository.topArchitectures.join(", ") : "(none)"
      }`,
    ],
  });

  sections.push({
    title: "Detected Domains",
    lines:
      domains.count === 0
        ? ["(none)"]
        : bullet(
            take(domains.domains, maxItems).map(
              (domain) =>
                `${domain.name} (confidence=${formatConfidence(domain.confidence)}, paths=${domain.paths.length})`,
            ),
          ),
  });

  sections.push({
    title: "Primary Entry Points",
    lines:
      entrypoints.count === 0
        ? ["(none)"]
        : bullet(
            take(entrypoints.entrypoints, maxItems).map(
              (entry) =>
                `${entry.framework}: ${entry.file} (confidence=${formatConfidence(entry.confidence)})`,
            ),
          ),
  });

  sections.push({
    title: "Detected Architecture",
    lines:
      architectures.count === 0
        ? ["(none)"]
        : bullet(
            take(architectures.architectures, maxItems).map((arch) => {
              const conflicts =
                arch.conflictingEvidence.length > 0
                  ? `; conflicts=${arch.conflictingEvidence.length}`
                  : "";
              return `${arch.pattern} (confidence=${formatConfidence(arch.confidence)}, rules=${arch.matchedRules.length}${conflicts})`;
            }),
          ),
  });

  sections.push({
    title: "Dependency Highlights",
    lines:
      dependencies.count === 0
        ? ["(none)"]
        : bullet(
            take(dependencies.dependencies, maxItems).map(
              (dep) =>
                `${dep.from} -[${dep.type}]-> ${dep.to} (confidence=${formatConfidence(dep.confidence)})`,
            ),
          ),
  });

  sections.push({
    title: "Relationship Highlights",
    lines:
      relationships.count === 0
        ? ["(none)"]
        : bullet(
            take(relationships.relationships, maxItems).map(
              (rel) =>
                `${rel.source} -[${rel.relationship}/${rel.strength}]-> ${rel.target} (confidence=${formatConfidence(rel.confidence)})`,
            ),
          ),
  });

  const stats = statistics.summary.statistics;
  sections.push({
    title: "Compiler Confidence",
    lines: [
      `Average Confidence: ${formatConfidence(stats.averageConfidence)}`,
      `Repository Summary Confidence: ${formatConfidence(repository.statistics.averageConfidence)}`,
      `Domains: ${stats.domainCount}`,
      `Entrypoints: ${stats.entrypointCount}`,
      `Dependencies: ${stats.dependencyCount}`,
      `Relationships: ${stats.relationshipCount}`,
      `Architectures: ${stats.architectureCount}`,
    ],
  });

  sections.push({
    title: "Statistics",
    lines: [
      `Evidence Count: ${stats.evidenceCount}`,
      `Pass Timing (ms): domains=${stats.passTimingMs.domains}, entrypoints=${stats.passTimingMs.entrypoints}, dependencies=${stats.passTimingMs.dependencies}, relationships=${stats.passTimingMs.relationships}, architectures=${stats.passTimingMs.architectures}`,
      `Queries Executed: ${snapshot.queryCount}`,
    ],
  });

  const evidenceLines: string[] = [];
  for (const domain of take(domains.domains, Math.min(3, maxItems))) {
    for (const item of take(domain.evidence, 2)) {
      evidenceLines.push(`domain:${domain.name}: ${item}`);
    }
  }
  for (const entry of take(entrypoints.entrypoints, Math.min(3, maxItems))) {
    for (const item of take(entry.evidence, 1)) {
      evidenceLines.push(`entrypoint:${entry.file}: ${item}`);
    }
  }
  for (const arch of take(architectures.architectures, Math.min(3, maxItems))) {
    for (const item of take(arch.matchedRules, 1)) {
      evidenceLines.push(`architecture:${arch.pattern}: ${item}`);
    }
  }
  sections.push({
    title: "Evidence Summary",
    lines: evidenceLines.length === 0 ? ["(none)"] : bullet(evidenceLines),
  });

  sections.push({
    title: "Unknowns",
    lines: snapshot.unknowns.length === 0 ? ["(none)"] : bullet(take(snapshot.unknowns, maxItems)),
  });

  sections.push({
    title: "Limitations",
    lines: bullet([...snapshot.limitations]),
  });

  const text = sections
    .map((section) => `${section.title}\n${section.lines.join("\n")}`)
    .join("\n\n");

  return { text: `${text}\n`, sections };
}
