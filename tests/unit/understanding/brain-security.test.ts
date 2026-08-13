import { describe, expect, it } from "vitest";

import {
  buildEvidence,
  redactEvidence,
} from "../../../src/core/understanding/brain/evidence/index.js";
import { redactBrainForStorage } from "../../../src/core/understanding/brain/security.js";
import type { ProjectBrain } from "../../../src/core/understanding/brain/types.js";
import {
  CONFIDENCE_CONTRACT,
  PROJECT_BRAIN_LIMITATIONS,
} from "../../../src/core/understanding/brain/index.js";

describe("brain security redaction", () => {
  it("redacts sensitive evidence locators", () => {
    const ev = buildEvidence({
      kind: "path",
      locator: "config/secrets.env",
      source: "test",
      snapshotId: "snap_x",
      epistemics: "observed",
    });
    const redacted = redactEvidence(ev);
    expect(redacted.locator).toContain("[REDACTED_NAME]");
    expect(redacted.redaction).toBe("path-only");
  });

  it("redacts secret-like claim objects on storage export", () => {
    const brain = {
      metadata: {
        schemaVersion: "1.0.0",
        brainId: "brain_x",
        projectName: "x",
        createdAt: "2026-08-06T00:00:00.000Z",
        updatedAt: "2026-08-06T00:00:00.000Z",
      },
      snapshot: {
        id: "snap_x",
        contentHash: "abc",
        compilerVersion: "0.1.0",
        schemaVersion: "1.0.0",
        projectName: "x",
        generatedAt: "2026-08-06T00:00:00.000Z",
        domainCount: 0,
        entrypointCount: 0,
        dependencyCount: 0,
        relationshipCount: 0,
        architectureCount: 0,
      },
      model: {} as ProjectBrain["model"],
      ownership: { ownerships: [], timingMs: 0, filesConsidered: 0, unknowns: [] },
      risks: { risks: [], timingMs: 0, unknowns: [] },
      components: [],
      claims: [
        {
          schemaVersion: "1.0.0",
          id: "claim_1",
          subject: "svc",
          predicate: "note",
          object: "password=hunter2",
          snapshotId: "snap_x",
          evidenceIds: [],
          confidence: 0.5,
          source: "project-brain",
          status: "ACTIVE",
          createdAt: "2026-08-06T00:00:00.000Z",
          contradictionIds: [],
        },
      ],
      evidence: [],
      contradictions: [],
      unknowns: [],
      limitations: PROJECT_BRAIN_LIMITATIONS,
      confidenceContract: CONFIDENCE_CONTRACT,
    } as unknown as ProjectBrain;

    const safe = redactBrainForStorage(brain);
    expect(safe.claims[0]?.object).toBe("[REDACTED]");
  });
});
