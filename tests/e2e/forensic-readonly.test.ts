import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { executeAgentTool, newToolCall } from "../../src/agent/tools/index.js";

describe("E2E forensic read-only mode", () => {
  const prev = process.env.AGENTDOCTOR_FORENSIC_MODE;

  afterEach(() => {
    if (prev === undefined) delete process.env.AGENTDOCTOR_FORENSIC_MODE;
    else process.env.AGENTDOCTOR_FORENSIC_MODE = prev;
  });

  it("refuses create_file even with approvedByHuman when forensic env is set", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-forensic-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "forensic-fixture", private: true }),
    );
    process.env.AGENTDOCTOR_FORENSIC_MODE = "1";
    try {
      const result = await executeAgentTool(
        root,
        newToolCall("e2e", "create_file", {
          path: "src/block.ts",
          content: "export const blocked = true;\n",
        }),
        { allowWrite: true, approvedByHuman: true },
      );
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("forensic_read_only");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
