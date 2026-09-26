import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  consumeApprovalGrant,
  hashFileWritePlan,
  issueApprovalGrant,
} from "../../../src/product/approval/session.js";

async function tempRoot(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "approval-sec", private: true }),
    "utf8",
  );
  return root;
}

describe("approval session security", () => {
  it("rejects bare consume without token", async () => {
    const root = await tempRoot("ad-appr-bare-");
    try {
      const planHash = hashFileWritePlan("file_create", "src/a.ts", "x\n");
      const result = await consumeApprovalGrant({
        root,
        token: undefined,
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: planHash,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Trusted approval token|Bare approved/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects forged token", async () => {
    const root = await tempRoot("ad-appr-forge-");
    try {
      const planHash = hashFileWritePlan("file_create", "src/a.ts", "x\n");
      const result = await consumeApprovalGrant({
        root,
        token: "agt_" + "0".repeat(48),
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: planHash,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not found/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects expired token", async () => {
    const root = await tempRoot("ad-appr-exp-");
    try {
      const content = "x\n";
      const planHash = hashFileWritePlan("file_create", "src/a.ts", content);
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
        planHash,
        ttlMs: -60_000,
      });
      const result = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: planHash,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/expired/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects consumed reuse", async () => {
    const root = await tempRoot("ad-appr-reuse-");
    try {
      const content = "x\n";
      const planHash = hashFileWritePlan("file_create", "src/a.ts", content);
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
        planHash,
      });
      const first = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: planHash,
      });
      expect(first.ok).toBe(true);
      const second = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: planHash,
      });
      expect(second.ok).toBe(false);
      expect(second.reason).toMatch(/consumed/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects wrong project root", async () => {
    const rootA = await tempRoot("ad-appr-rootA-");
    const rootB = await tempRoot("ad-appr-rootB-");
    try {
      const content = "x\n";
      const planHash = hashFileWritePlan("file_create", "src/a.ts", content);
      const grant = await issueApprovalGrant({
        root: rootA,
        action: "file_create",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
        planHash,
      });
      const result = await consumeApprovalGrant({
        root: rootB,
        token: grant.token,
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: planHash,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not found|root mismatch/i);
    } finally {
      await fs.rm(rootA, { recursive: true, force: true });
      await fs.rm(rootB, { recursive: true, force: true });
    }
  });

  it("rejects planHash mismatch", async () => {
    const root = await tempRoot("ad-appr-hash-");
    try {
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
        planHash: hashFileWritePlan("file_create", "src/a.ts", "original\n"),
      });
      const result = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: ["src/a.ts"],
        requirePlanHash: hashFileWritePlan("file_create", "src/a.ts", "tampered\n"),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/planHash mismatch/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects action mismatch", async () => {
    const root = await tempRoot("ad-appr-action-");
    try {
      const content = "x\n";
      const planHash = hashFileWritePlan("file_create", "src/a.ts", content);
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
        planHash,
      });
      const result = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_edit",
        resources: ["src/a.ts"],
        requirePlanHash: hashFileWritePlan("file_edit", "src/a.ts", content),
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/action mismatch/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects * resource at issue", async () => {
    const root = await tempRoot("ad-appr-star-");
    try {
      await expect(
        issueApprovalGrant({
          root,
          action: "file_create",
          resources: ["*"],
          risk: "HIGH",
          planHash: hashFileWritePlan("file_create", "src/a.ts", "x\n"),
        }),
      ).rejects.toThrow(/Bare '\*'/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("path grant cannot edit different path", async () => {
    const root = await tempRoot("ad-appr-path-");
    try {
      const contentB = "b\n";
      const planHashB = hashFileWritePlan("file_create", "src/b.ts", contentB);
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
        planHash: planHashB,
      });
      const result = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: ["src/b.ts"],
        requirePlanHash: planHashB,
        consume: false,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not covered/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("directory prefix grant covers children", async () => {
    const root = await tempRoot("ad-appr-dir-");
    try {
      await fs.mkdir(path.join(root, "src", "nested"), { recursive: true });
      const rel = "src/nested/child.ts";
      const content = "export const c = 1;\n";
      const planHash = hashFileWritePlan("file_create", rel, content);
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/"],
        risk: "MEDIUM",
        planHash,
      });
      const result = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: [rel],
        requirePlanHash: planHash,
        consume: false,
      });
      expect(result.ok).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
