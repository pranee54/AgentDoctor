import { describe, expect, it } from "vitest";

import { renderFixPlanTerminal } from "../../../src/core/fix/render.js";
import type { FixPlan } from "../../../src/core/fix/types.js";

describe("fix Next steps workflow", () => {
  it("dry-run with actions points at fix -y then verify", () => {
    const plan: FixPlan = {
      root: "/tmp",
      actions: [
        {
          id: "a1",
          agent: "cursor",
          kind: "append-ignore-pattern",
          description: "Ignore dist/",
          pattern: "dist/",
          evidencePath: "dist",
          findingIds: ["f1"],
          targetRelativePath: ".cursorignore",
        },
      ],
      skipped: [
        {
          findingId: "f2",
          ruleId: "security/env-file-exposure",
          reason: "Requires human review (not auto-fixed)",
        },
      ],
    };

    const output = renderFixPlanTerminal(plan, {
      dryRun: true,
      cursorContent: null,
    });

    expect(output).toContain("Next");
    expect(output).toContain("agentdoctor fix -y");
    expect(output).toContain("agentdoctor verify --baseline agentdoctor-report.json");
    expect(output).toContain("agentdoctor scan --json > agentdoctor-report.json");
    expect(output).toContain("agentdoctor explain <rule-id>");
  });

  it("review-only plan points at explain and verify, not fix -y", () => {
    const plan: FixPlan = {
      root: "/tmp",
      actions: [],
      skipped: [
        {
          findingId: "f2",
          ruleId: "security/env-file-exposure",
          reason: "Requires human review (not auto-fixed)",
        },
      ],
    };

    const output = renderFixPlanTerminal(plan, {
      dryRun: true,
      cursorContent: null,
    });

    expect(output).toContain("Next");
    expect(output).toContain("agentdoctor explain <rule-id>");
    expect(output).toContain("agentdoctor verify --baseline agentdoctor-report.json");
    expect(output).not.toContain("agentdoctor fix -y");
  });
});
