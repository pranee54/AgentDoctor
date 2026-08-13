import {
  averageBrainConfidence,
  buildBrainDelta,
  createBrainQueryEngine,
  explainClaim,
  PROJECT_BRAIN_LIMITATIONS,
  redactEvidenceList,
  traceBrain,
  type BrainEvidence,
  type BrainQuery,
  type BrainQueryType,
  type TraceEdge,
} from "../../../core/understanding/brain/index.js";
import { BrainMcpError } from "../errors.js";
import { wrapProvenance, type BrainMcpEnvelope } from "../provenance.js";
import {
  asObject,
  parseClaimStatus,
  requireString,
  resolveQueryType,
  resolveTraceMode,
} from "../schemas.js";
import type { BrainMcpSession } from "../session.js";

export type ToolResult = BrainMcpEnvelope<unknown>;

function optionalString(args: Record<string, unknown>, field: string): string | undefined {
  const value = args[field];
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireString(value, field);
}

export async function handleBrainOverview(session: BrainMcpSession): Promise<ToolResult> {
  const brain = session.getBrain();
  const activeClaims = brain.claims.filter((c) => c.status === "ACTIVE");
  const contradicted = brain.claims.filter((c) => c.status === "CONTRADICTED");
  const confidences = [
    ...activeClaims.map((c) => c.confidence),
    ...brain.components.map((c) => c.confidence),
    ...brain.risks.risks.map((r) => r.confidence),
  ];

  return wrapProvenance({
    brain,
    evidenceIds: brain.evidence
      .map((e) => e.id)
      .slice()
      .sort((a, b) => a.localeCompare(b)),
    confidence: averageBrainConfidence(confidences),
    metadata: { tool: "brain_overview" },
    result: {
      repository: {
        projectName: brain.metadata.projectName,
        brainId: brain.metadata.brainId,
        root: session.getProjectRoot(),
      },
      snapshotId: brain.snapshot.id,
      schemaVersion: brain.metadata.schemaVersion,
      modelVersion: brain.model.metadata.schemaVersion,
      domains: brain.model.domains
        .map((d) => d.name)
        .slice()
        .sort((a, b) => a.localeCompare(b)),
      entrypoints: brain.model.entrypoints
        .map((e) => ({ file: e.file, framework: e.framework, confidence: e.confidence }))
        .slice()
        .sort((a, b) => a.file.localeCompare(b.file)),
      components: brain.components
        .map((c) => ({ id: c.id, name: c.name, type: c.type, path: c.path }))
        .slice()
        .sort((a, b) => a.path.localeCompare(b.path)),
      architecture: brain.model.architectures
        .map((a) => ({
          pattern: a.pattern,
          confidence: a.confidence,
          matchedRules: a.matchedRules,
        }))
        .slice()
        .sort((a, b) => a.pattern.localeCompare(b.pattern)),
      ownershipSummary: {
        matchCount: brain.ownership.ownerships.length,
        unknowns: brain.ownership.unknowns.slice().sort((a, b) => a.localeCompare(b)),
      },
      riskSummary: {
        riskKind: "change-danger",
        notVulnerabilityScanner: true,
        count: brain.risks.risks.length,
        byKind: Object.fromEntries(
          [...brain.risks.risks]
            .reduce((map, risk) => {
              map.set(risk.kind, (map.get(risk.kind) ?? 0) + 1);
              return map;
            }, new Map<string, number>())
            .entries(),
        ),
      },
      activeClaimCount: activeClaims.length,
      contradictedClaimCount: contradicted.length,
      contradictionCount: brain.contradictions.length,
      unknownCount: brain.unknowns.length,
      limitations: [...brain.limitations, ...PROJECT_BRAIN_LIMITATIONS],
      confidenceSummary: {
        contract: brain.confidenceContract,
        average: averageBrainConfidence(confidences),
      },
    },
  });
}

export async function handleBrainQuery(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const typeInput = requireString(args.type ?? args.queryType ?? args.intent, "type");
  const queryType = resolveQueryType(typeInput);

  if (queryType === "ListChanges") {
    throw new BrainMcpError(
      "unsupported_query",
      "ListChanges requires an in-memory previous brain; use brain_delta with snapshot ids instead",
    );
  }

  let query: BrainQuery;
  if (queryType === "Impact" || queryType === "BlastRadius") {
    const target = requireString(args.target, "target");
    query = { type: queryType, target };
  } else if (queryType === "ListClaims") {
    const status = parseClaimStatus(optionalString(args, "status"));
    query = status ? { type: "ListClaims", status } : { type: "ListClaims" };
  } else {
    query = {
      type: queryType as Exclude<
        BrainQueryType,
        "Impact" | "BlastRadius" | "ListChanges" | "ListClaims"
      >,
    };
  }

  const brain = session.getBrain();
  const response = createBrainQueryEngine(brain).execute(query);
  return wrapProvenance({
    brain,
    result: response.result,
    evidenceIds: response.evidenceIds,
    confidence: response.confidence,
    metadata: {
      tool: "brain_query",
      queryType: response.metadata.queryType,
      brainId: response.metadata.brainId,
    },
  });
}

export async function handleBrainExplain(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const claimId = requireString(args.claimId ?? args.id, "claimId");
  const brain = session.getBrain();
  const explanation = explainClaim(brain, claimId);
  if (!explanation) {
    throw new BrainMcpError("not_found", `claim not found: ${claimId}`);
  }
  return wrapProvenance({
    brain,
    result: {
      claim: explanation.claim,
      status: explanation.status,
      confidence: explanation.confidence,
      evidence: redactEvidenceList(explanation.supportingEvidence),
      contradictions: explanation.contradictions,
      invalidation: explanation.invalidationState,
      unknowns: explanation.unknowns,
    },
    evidenceIds: explanation.supportingEvidence.map((e) => e.id),
    confidence: explanation.confidence,
    claimStatus: explanation.status,
    metadata: { tool: "brain_explain", claimId },
  });
}

export async function handleBrainTrace(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const target = requireString(args.target ?? args.root, "target");
  const mode = resolveTraceMode(optionalString(args, "mode"));
  const brain = session.getBrain();
  const trace = traceBrain(brain, target, mode);
  const evidenceIds = [
    ...new Set(trace.edges.flatMap((edge: TraceEdge) => [...edge.evidence])),
  ].sort((a: string, b: string) => a.localeCompare(b));
  const truncated = trace.edges.length >= 5000;

  return wrapProvenance({
    brain,
    result: {
      root: trace.root,
      mode,
      nodes: trace.nodes,
      edges: trace.edges,
      cycles: trace.cycles,
      caps: { maxDepth: 25, maxEdges: 5000 },
      truncated: truncated || trace.edges.length >= 5000,
      confidence: trace.confidence,
    },
    evidenceIds,
    confidence: trace.confidence,
    metadata: { tool: "brain_trace", mode, target },
  });
}

export async function handleBrainClaims(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const status = parseClaimStatus(optionalString(args, "status"));
  const includeHistorical = args.includeHistorical === true;
  const brain = session.getBrain();

  let claims = [...brain.claims];
  if (status) {
    claims = claims.filter((c) => c.status === status);
  } else if (!includeHistorical) {
    // Truth filter: default excludes INVALIDATED / SUPERSEDED
    claims = claims.filter((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
  }

  claims.sort((a, b) => a.id.localeCompare(b.id));

  return wrapProvenance({
    brain,
    result: {
      claims: claims.map((c) => ({
        id: c.id,
        subject: c.subject,
        predicate: c.predicate,
        object: c.object,
        status: c.status,
        confidence: c.confidence,
        evidenceIds: c.evidenceIds,
        snapshotId: c.snapshotId,
        contradictionIds: c.contradictionIds,
        invalidatedAt: c.invalidatedAt,
        supersededBy: c.supersededBy,
      })),
      truthFilter: status
        ? `status=${status}`
        : includeHistorical
          ? "all-statuses"
          : "ACTIVE+CONTRADICTED",
    },
    evidenceIds: claims.flatMap((c) => c.evidenceIds),
    confidence: averageBrainConfidence(claims.map((c) => c.confidence)),
    metadata: { tool: "brain_claims", includeHistorical, status: status ?? null },
  });
}

export async function handleBrainEvidence(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const evidenceId = optionalString(args, "evidenceId") ?? optionalString(args, "id");
  const brain = session.getBrain();
  let evidence: BrainEvidence[] = [...redactEvidenceList(brain.evidence)];
  if (evidenceId) {
    evidence = evidence.filter((e: BrainEvidence) => e.id === evidenceId);
    if (evidence.length === 0) {
      throw new BrainMcpError("not_found", `evidence not found: ${evidenceId}`);
    }
  }
  evidence = [...evidence].sort((a, b) => a.id.localeCompare(b.id));

  const claimLinks = brain.claims
    .filter((c) => c.evidenceIds.some((id) => evidence.some((e: BrainEvidence) => e.id === id)))
    .map((c) => ({
      claimId: c.id,
      status: c.status,
      evidenceIds: c.evidenceIds.filter((id) => evidence.some((e: BrainEvidence) => e.id === id)),
    }))
    .sort((a, b) => a.claimId.localeCompare(b.claimId));

  return wrapProvenance({
    brain,
    result: {
      evidence: evidence.map((e: BrainEvidence) => ({
        id: e.id,
        kind: e.kind,
        epistemics: e.epistemics,
        locator: e.locator,
        source: e.source,
        symbol: e.symbol,
        redaction: e.redaction,
      })),
      claimRelationships: claimLinks,
      redacted: true,
    },
    evidenceIds: evidence.map((e: BrainEvidence) => e.id),
    confidence: 1,
    metadata: { tool: "brain_evidence" },
  });
}

export async function handleBrainOwnership(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const filePath = optionalString(args, "path") ?? optionalString(args, "filePath");
  const brain = session.getBrain();
  let ownerships = [...brain.ownership.ownerships];
  if (filePath) {
    ownerships = ownerships.filter(
      (o) =>
        o.path === filePath ||
        o.path.endsWith(`/${filePath}`) ||
        filePath.endsWith(o.path) ||
        o.path.includes(filePath),
    );
  }
  ownerships.sort((a, b) => a.path.localeCompare(b.path));

  const result =
    filePath && ownerships.length === 0
      ? {
          path: filePath,
          ownership: "UNKNOWN" as const,
          matches: [],
          unknowns: brain.ownership.unknowns,
          sourcesAllowed: ["CODEOWNERS", "MAINTAINERS", "package-metadata"] as const,
          note: "Ownership is UNKNOWN without explicit CODEOWNERS / MAINTAINERS / package evidence",
        }
      : {
          matches: ownerships,
          unknowns: brain.ownership.unknowns.slice().sort((a, b) => a.localeCompare(b)),
          sourcesAllowed: ["CODEOWNERS", "MAINTAINERS", "package-metadata"] as const,
          inferenceForbidden: [
            "git-blame",
            "cwd-guessing",
            "author-guessing",
            "commit-frequency",
          ] as const,
        };

  return wrapProvenance({
    brain,
    result,
    evidenceIds: [],
    confidence: averageBrainConfidence(ownerships.map((o) => o.confidence)),
    metadata: { tool: "brain_ownership", path: filePath ?? null },
  });
}

export async function handleBrainRisk(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const kind = optionalString(args, "kind");
  const brain = session.getBrain();
  let risks = [...brain.risks.risks];
  if (kind) {
    risks = risks.filter((r) => r.kind === kind);
  }
  risks.sort((a, b) => {
    const byKind = a.kind.localeCompare(b.kind);
    if (byKind !== 0) return byKind;
    return a.target.localeCompare(b.target);
  });

  return wrapProvenance({
    brain,
    result: {
      riskKind: "change-danger",
      notVulnerabilityScanner: true,
      distinction: {
        changeRisk:
          "Project Brain change-danger (entrypoint centrality, coupling, ownership clarity, architecture conflict)",
        securityVulnerability: "AgentDoctor Safety Scan findings — not produced by this tool",
      },
      risks: risks.map((r) => ({
        kind: r.kind,
        severity: r.severity,
        target: r.target,
        rationale: r.rationale,
        confidence: r.confidence,
        evidence: r.evidence,
      })),
      unknowns: brain.risks.unknowns.slice().sort((a, b) => a.localeCompare(b)),
    },
    evidenceIds: [],
    confidence: averageBrainConfidence(risks.map((r) => r.confidence)),
    metadata: { tool: "brain_risk", kind: kind ?? null },
  });
}

export async function handleBrainDelta(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const fromSnapshot = requireString(args.fromSnapshot ?? args.from, "fromSnapshot");
  const toSnapshot =
    optionalString(args, "toSnapshot") ??
    optionalString(args, "to") ??
    session.getBrain().snapshot.id;

  const store = session.getStore();
  let before;
  let after;
  try {
    before = await store.loadSnapshot(fromSnapshot);
    after =
      toSnapshot === session.getBrain().snapshot.id
        ? session.getBrain()
        : await store.loadSnapshot(toSnapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to load snapshots";
    throw new BrainMcpError("brain_corrupt", message);
  }

  const delta = buildBrainDelta(before, after);

  return wrapProvenance({
    brain: after,
    result: {
      fromSnapshot: delta.beforeSnapshotId,
      toSnapshot: delta.afterSnapshotId,
      added: delta.addedClaimIds,
      removed: delta.removedClaimIds,
      changed: delta.changedClaimIds,
      invalidatedClaims: delta.invalidatedClaimIds,
      newClaims: delta.addedClaimIds,
      supersededClaims: delta.supersededClaimIds,
      contradictedClaims: delta.contradictedClaimIds,
      contradictions: {
        added: delta.newContradictionIds,
        resolved: delta.resolvedContradictionIds,
      },
      components: {
        added: delta.addedComponentIds,
        removed: delta.removedComponentIds,
      },
      ownershipChanges: delta.ownershipChanges,
      riskChanges: delta.riskChanges,
      dependencyChanges: delta.dependencyChanges,
      summary: delta.summary,
    },
    evidenceIds: [],
    confidence: 1,
    metadata: {
      tool: "brain_delta",
      fromSnapshot,
      toSnapshot,
      readOnly: true,
    },
  });
}

export async function handleBrainSnapshot(
  session: BrainMcpSession,
  rawArgs: unknown,
): Promise<ToolResult> {
  const args = asObject(rawArgs);
  const action = (optionalString(args, "action") ?? "current").toLowerCase();

  if (action === "rebuild") {
    const brain = await session.rebuild();
    return wrapProvenance({
      brain,
      result: {
        action: "rebuild",
        snapshot: {
          id: brain.snapshot.id,
          contentHash: brain.snapshot.contentHash,
          createdAt: brain.snapshot.generatedAt,
        },
      },
      evidenceIds: [],
      confidence: 1,
      metadata: { tool: "brain_snapshot", action },
    });
  }

  if (action === "history") {
    const brain = session.getBrain();
    const snapshots = await session.listSnapshots();
    const sorted = [...snapshots].sort((a, b) => a.id.localeCompare(b.id));
    return wrapProvenance({
      brain,
      result: {
        action: "history",
        latestSnapshotId: brain.snapshot.id,
        snapshots: sorted.map((s) => ({
          id: s.id,
          contentHash: s.contentHash,
          createdAt: s.createdAt,
          checksum: s.checksum,
          projectName: s.projectName,
          brainId: s.brainId,
        })),
      },
      evidenceIds: [],
      confidence: 1,
      metadata: { tool: "brain_snapshot", action },
    });
  }

  if (action === "compare") {
    const leftId = requireString(args.leftId ?? args.fromSnapshot, "leftId");
    const rightId = requireString(args.rightId ?? args.toSnapshot, "rightId");
    const comparison = await session.compareSnapshots(leftId, rightId);
    const brain = session.getBrain();
    return wrapProvenance({
      brain,
      result: { action: "compare", comparison },
      evidenceIds: [],
      confidence: 1,
      metadata: { tool: "brain_snapshot", action },
    });
  }

  if (action === "load") {
    const snapshotId = requireString(args.snapshotId ?? args.id, "snapshotId");
    const brain = await session.loadSnapshot(snapshotId);
    return wrapProvenance({
      brain,
      result: {
        action: "load",
        snapshot: {
          id: brain.snapshot.id,
          contentHash: brain.snapshot.contentHash,
          createdAt: brain.snapshot.generatedAt,
        },
      },
      evidenceIds: [],
      confidence: 1,
      metadata: { tool: "brain_snapshot", action },
    });
  }

  if (action === "current" || action === "latest" || action === "metadata") {
    const brain = session.getBrain();
    return wrapProvenance({
      brain,
      result: {
        action: "current",
        snapshot: {
          id: brain.snapshot.id,
          schemaVersion: brain.metadata.schemaVersion,
          contentHash: brain.snapshot.contentHash,
          createdAt: brain.snapshot.generatedAt,
          brainId: brain.metadata.brainId,
          projectName: brain.metadata.projectName,
        },
        storeRoot: session.getStore().root,
      },
      evidenceIds: [],
      confidence: 1,
      metadata: { tool: "brain_snapshot", action: "current" },
    });
  }

  throw new BrainMcpError(
    "invalid_argument",
    `unsupported brain_snapshot action "${action}"; use current|history|compare|load|rebuild`,
  );
}
