import type { Finding } from "../../types/index.js";
import { dedupeFindings, summarizeFindings } from "./dedupe.js";
import { ruleRegistry } from "./registry.js";
import type { FindingDraft, RuleContext, RuleDefinition } from "./types.js";

export interface RunRulesOptions {
  context: RuleContext;
  rules?: readonly RuleDefinition[];
  includeRules?: string[];
  excludeRules?: string[];
}

export interface RunRulesResult {
  findings: Finding[];
  summary: ReturnType<typeof summarizeFindings>;
  elapsedMs: number;
  ruleErrors: string[];
}

export async function runRules(options: RunRulesOptions): Promise<RunRulesResult> {
  const started = performance.now();
  const rules = (options.rules ?? ruleRegistry).filter((rule) => {
    if (options.includeRules && options.includeRules.length > 0) {
      return options.includeRules.includes(rule.id);
    }
    if (options.excludeRules && options.excludeRules.length > 0) {
      return !options.excludeRules.includes(rule.id);
    }
    return true;
  });

  const drafts: FindingDraft[] = [];
  const ruleErrors: string[] = [];

  for (const rule of rules) {
    try {
      const results = await rule.check(options.context);
      for (const draft of results) {
        // Ensure ruleId matches registry entry
        drafts.push({ ...draft, ruleId: rule.id });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ruleErrors.push(`Rule ${rule.id} failed: ${message}`);
    }
  }

  const findings = dedupeFindings(drafts);
  return {
    findings,
    summary: summarizeFindings(findings),
    elapsedMs: Math.round(performance.now() - started),
    ruleErrors,
  };
}
