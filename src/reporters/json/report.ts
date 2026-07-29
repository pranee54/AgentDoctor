import type { ScanResult } from "../../types/index.js";
import { sanitizeForOutput } from "../../utils/path.js";

/**
 * Stable machine-readable scan output. No decorative terminal formatting.
 */
export function renderJsonReport(result: ScanResult): string {
  const payload = {
    version: result.version,
    repository: {
      root: sanitizeForOutput(result.repository.root),
      languages: result.repository.languages,
      primaryLanguage: result.repository.primaryLanguage,
      frameworks: result.repository.frameworks,
      primaryFramework: result.repository.primaryFramework,
      packageManagers: result.repository.packageManagers,
      primaryPackageManager: result.repository.primaryPackageManager,
      monorepo: result.repository.monorepo,
      filesScanned: result.repository.filesScanned,
    },
    agents: result.agents.map((agent) => ({
      id: agent.id,
      displayName: agent.displayName,
      detected: agent.detected,
      configured: agent.configured,
      status: agent.status,
      summary: sanitizeForOutput(agent.summary),
      configFiles: agent.configFiles.map((file) => ({
        relativePath: sanitizeForOutput(file.relativePath),
        kind: file.kind,
        sizeBytes: file.sizeBytes,
        empty: file.empty,
        readable: file.readable,
        legacy: file.legacy,
        scope: file.scope,
        ...(file.parseError !== undefined
          ? { parseError: sanitizeForOutput(file.parseError) }
          : {}),
      })),
      configPaths: agent.configPaths.map(sanitizeForOutput),
      diagnostics: agent.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: sanitizeForOutput(diagnostic.message),
        ...(diagnostic.file !== undefined ? { file: sanitizeForOutput(diagnostic.file) } : {}),
      })),
      metadata: agent.metadata,
    })),
    findings: result.findings.map((finding) => ({
      id: finding.id,
      ruleId: finding.ruleId,
      category: finding.category,
      severity: finding.severity,
      title: sanitizeForOutput(finding.title),
      message: sanitizeForOutput(finding.message),
      whyItMatters: sanitizeForOutput(finding.whyItMatters),
      ...(finding.recommendation !== undefined
        ? { recommendation: sanitizeForOutput(finding.recommendation) }
        : {}),
      affectedAgents: finding.affectedAgents,
      ...(finding.evidence !== undefined
        ? {
            evidence: {
              ...(finding.evidence.path !== undefined
                ? { path: sanitizeForOutput(finding.evidence.path) }
                : {}),
              ...(finding.evidence.line !== undefined ? { line: finding.evidence.line } : {}),
              ...(finding.evidence.detail !== undefined
                ? { detail: sanitizeForOutput(finding.evidence.detail) }
                : {}),
            },
          }
        : {}),
      fixability: finding.fixability,
    })),
    summary: result.summary,
    scoringAvailable: result.scoringAvailable,
    scores: result.scores,
    agentSecurityAnalysis: result.agentSecurityAnalysis,
    timing: result.timing,
    diagnostics: {
      warnings: result.diagnostics.warnings.map(sanitizeForOutput),
      errors: result.diagnostics.errors.map(sanitizeForOutput),
    },
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
