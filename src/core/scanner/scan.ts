import { detectAgents } from "../../agents/detect-agents.js";
import { PACKAGE_VERSION, DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { sanitizeTerminalText } from "../../security/redaction.js";
import type { ScanOptions, ScanResult } from "../../types/index.js";
import { buildRuleContext } from "../rules/build-context.js";
import { runRules } from "../rules/run-rules.js";
import { computeReadinessScores } from "../scoring/compute-scores.js";

/**
 * Public scan entry point.
 * Pipeline: discovery → project detection → agent adapters → rule engine → findings → scores.
 */
export async function scan(options: ScanOptions = {}): Promise<ScanResult> {
  const totalStarted = performance.now();
  const cwd = options.cwd ?? process.cwd();
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  const detectionStarted = performance.now();
  const { repository, discovery, diagnostics } = await detectProject(cwd, maxFileSizeBytes);
  const detectionMs = Math.round(performance.now() - detectionStarted);

  const { agents, elapsedMs: agentsMs } = await detectAgents({
    root: repository.root,
    discovery,
    maxFileSizeBytes,
  });

  const ruleContext = await buildRuleContext({
    root: repository.root,
    repository,
    discovery,
    agents,
    maxFileSizeBytes,
  });

  const {
    findings,
    summary,
    elapsedMs: rulesMs,
    ruleErrors,
  } = await runRules({
    context: ruleContext,
    ...(options.includeRules !== undefined ? { includeRules: options.includeRules } : {}),
    ...(options.excludeRules !== undefined ? { excludeRules: options.excludeRules } : {}),
  });

  const warnings = [...diagnostics];
  for (const agent of agents) {
    for (const diagnostic of agent.diagnostics) {
      if (diagnostic.severity === "info") {
        continue;
      }
      const location = diagnostic.file ? ` (${sanitizeTerminalText(diagnostic.file)})` : "";
      warnings.push(`${sanitizeTerminalText(diagnostic.message)}${location}`);
    }
  }
  for (const error of ruleErrors) {
    warnings.push(sanitizeTerminalText(error));
  }

  const agentsPresent = agents.some((a) => a.detected || a.configured);
  const agentSecurityAnalysis = agentsPresent ? "full" : "limited";
  if (agentSecurityAnalysis === "limited") {
    warnings.push(
      "No supported coding-agent configuration detected; agent-specific security exposure checks are limited.",
    );
  }

  const scoringStarted = performance.now();
  const scores = computeReadinessScores(findings);
  const scoringMs = Math.round(performance.now() - scoringStarted);

  return {
    version: PACKAGE_VERSION,
    repository,
    agents,
    findings,
    summary,
    scores,
    scoringAvailable: true,
    agentSecurityAnalysis,
    timing: {
      discoveryMs: discovery.elapsedMs,
      detectionMs,
      agentsMs,
      rulesMs,
      scoringMs,
      totalMs: Math.round(performance.now() - totalStarted),
    },
    diagnostics: {
      warnings,
      errors: [],
    },
  };
}
