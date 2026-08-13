import type { ProjectModel } from "../../model/types.js";
import type { OwnershipDiscoveryResult } from "../../ownership/types.js";
import { ownersForPath } from "../../ownership/index.js";
import type { RiskDiscoveryResult } from "../../risks/types.js";
import { averageBrainConfidence, clampBrainConfidence } from "../confidence.js";
import type { BrainEvidence } from "../evidence/types.js";
import { buildEvidence } from "../evidence/types.js";
import { createComponentId, type BrainComponent } from "./types.js";

export function buildComponents(options: {
  model: ProjectModel;
  ownership: OwnershipDiscoveryResult;
  risks: RiskDiscoveryResult;
  snapshotId: string;
  evidence: BrainEvidence[];
}): { components: BrainComponent[]; evidence: BrainEvidence[] } {
  const { model, ownership, risks, snapshotId } = options;
  const evidence = [...options.evidence];
  const pushEv = (locator: string, source: string): string => {
    const ev = buildEvidence({
      kind: "path",
      locator,
      source,
      snapshotId,
      epistemics: "observed",
      redaction: "path-only",
    });
    evidence.push(ev);
    return ev.id;
  };

  const nodes = new Map<string, { path: string; type: BrainComponent["type"]; name: string }>();

  for (const domain of model.domains) {
    for (const p of domain.paths.slice(0, 20)) {
      nodes.set(p, { path: p, type: "domain-surface", name: domain.name });
    }
  }
  for (const entry of model.entrypoints) {
    nodes.set(entry.file, {
      path: entry.file,
      type: "entrypoint",
      name: entry.file.split(/[/\\]/).pop() ?? entry.file,
    });
  }
  for (const dep of model.dependencies) {
    if (!nodes.has(dep.from)) {
      nodes.set(dep.from, { path: dep.from, type: "module", name: dep.from });
    }
    if (!nodes.has(dep.to)) {
      nodes.set(dep.to, { path: dep.to, type: "module", name: dep.to });
    }
  }
  for (const rel of model.relationships) {
    if (!nodes.has(rel.source)) {
      nodes.set(rel.source, { path: rel.source, type: "module", name: rel.source });
    }
    if (!nodes.has(rel.target)) {
      nodes.set(rel.target, { path: rel.target, type: "module", name: rel.target });
    }
  }

  const components: BrainComponent[] = [];
  for (const node of [...nodes.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    const id = createComponentId(node.type, node.path);
    const evId = pushEv(node.path, "component-model");
    const ownerMatch = ownersForPath(node.path, ownership.ownerships);
    const domainIds = model.domains
      .filter((d) => d.paths.some((p) => node.path.includes(p) || p.includes(node.path)))
      .map((d) => d.id);
    const dependencyIds = model.dependencies
      .filter((d) => d.from === node.path || d.from.includes(node.path))
      .map((d) => d.id);
    const dependentIds = model.dependencies
      .filter((d) => d.to === node.path || d.to.includes(node.path))
      .map((d) => d.id);
    const entrypointIds = model.entrypoints
      .filter((e) => e.file === node.path || node.path.includes(e.file))
      .map((e) => e.id);
    const riskKinds = [
      ...new Set(
        risks.risks
          .filter((r) => r.target === node.path || node.path.includes(r.target))
          .map((r) => r.kind),
      ),
    ];

    const confidences = [
      ...model.dependencies
        .filter((d) => d.from === node.path || d.to === node.path)
        .map((d) => d.confidence),
      ...model.entrypoints.filter((e) => e.file === node.path).map((e) => e.confidence),
    ];

    const component: BrainComponent = {
      id,
      type: node.type,
      name: node.name,
      path: node.path,
      domainIds,
      dependencyIds,
      dependentIds,
      entrypointIds,
      riskKinds,
      evidenceIds: [evId],
      confidence: clampBrainConfidence(
        confidences.length > 0 ? averageBrainConfidence(confidences) : 0.55,
      ),
    };
    if (ownerMatch?.owners[0]) {
      component.owner = ownerMatch.owners[0];
    }
    components.push(component);
  }

  return { components, evidence };
}

export type { BrainComponent, BrainComponentType } from "./types.js";
export { createComponentId } from "./types.js";
