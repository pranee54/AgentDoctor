import path from "node:path";

import { pathExistsInsideRoot } from "../../../agents/inspect.js";
import { isPathInsideRoot } from "../../../utils/path.js";
import type { FindingDraft, RuleDefinition } from "../types.js";

const INSTRUCTION_KINDS = new Set([
  "cursor-rule-mdc",
  "cursor-legacy-cursorrules",
  "agents-md",
  "agents-override-md",
  "claude-md",
  "claude-local-md",
  "claude-rule-md",
]);

/**
 * Conservative local path extraction:
 * - Markdown links: [text](relative/path.ext)
 * - Backticked paths with separators or extensions
 */
function extractPathCandidates(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
    const target = (match[1] ?? "").trim();
    if (isConservativeLocalPath(target)) {
      found.add(stripAnchor(target));
    }
  }

  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const target = (match[1] ?? "").trim();
    if (isConservativeLocalPath(target)) {
      found.add(stripAnchor(target));
    }
  }

  return [...found];
}

function stripAnchor(value: string): string {
  return value.split("#")[0] ?? value;
}

function isConservativeLocalPath(value: string): boolean {
  if (!value || value.length > 200) return false;
  if (/^(https?:|mailto:|file:)/i.test(value)) return false;
  if (value.startsWith("#")) return false;
  if (value.includes("://")) return false;
  if (value.includes("\n") || value.includes(" ")) return false;
  // Must look like a path: has / or a file extension
  if (!value.includes("/") && !/\.[a-z0-9]{1,8}$/i.test(value)) return false;
  // Reject shell-looking fragments
  if (/[;&|$]/.test(value)) return false;
  // Reject traversal escape attempts — still check but flag separately
  return true;
}

export const missingPathReferenceRule: RuleDefinition = {
  id: "instructions/missing-path-reference",
  title: "Instruction references a missing path",
  description:
    "Detects markdown/backtick local path references in instruction files that do not exist.",
  category: "instructions",
  severity: "warning",
  fixability: "manual",
  rationale: "Broken path references mislead agents and waste tool-call attempts.",
  recommendation: "Update or remove the stale path reference.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const seen = new Set<string>();

    for (const agent of context.agents) {
      for (const file of agent.configFiles) {
        if (!INSTRUCTION_KINDS.has(file.kind) || file.empty || !file.readable) {
          continue;
        }
        if (seen.has(file.relativePath)) {
          continue;
        }
        seen.add(file.relativePath);

        const cached = await context.textCache.read(file.relativePath);
        if (!cached.text || cached.binary) {
          continue;
        }

        const candidates = extractPathCandidates(cached.text);
        for (const candidate of candidates) {
          // Resolve relative to instruction file directory, stay inside root
          const baseDir = path.posix.dirname(file.relativePath);
          const resolvedRelative = path.posix.normalize(
            baseDir === "." ? candidate : path.posix.join(baseDir, candidate),
          );

          if (resolvedRelative.startsWith("../") || resolvedRelative === "..") {
            findings.push({
              ruleId: "instructions/missing-path-reference",
              category: "instructions",
              severity: "warning",
              title: "Instruction references a missing path",
              message: `${file.relativePath} references \`${candidate}\`, which escapes the repository root`,
              whyItMatters:
                "Path references outside the repository cannot be validated and may confuse agents.",
              recommendation: "Use repository-relative paths only.",
              affectedAgents: context.agents
                .filter((a) => a.configPaths.includes(file.relativePath))
                .map((a) => a.id),
              evidence: { path: file.relativePath, detail: `ref=${candidate}` },
              fixability: "manual",
            });
            continue;
          }

          const absolute = path.resolve(context.root, resolvedRelative);
          if (!isPathInsideRoot(context.root, absolute)) {
            continue;
          }

          const exists = await pathExistsInsideRoot(context.root, resolvedRelative);
          if (exists) {
            continue;
          }

          findings.push({
            ruleId: "instructions/missing-path-reference",
            category: "instructions",
            severity: "warning",
            title: "Instruction references a missing path",
            message: `${file.relativePath} references \`${candidate}\`, but that path does not exist`,
            whyItMatters:
              "Agents may follow documented paths that no longer exist, causing failed reads and wasted context.",
            recommendation: "Fix the path or remove the stale reference.",
            affectedAgents: context.agents
              .filter((a) => a.configPaths.includes(file.relativePath))
              .map((a) => a.id),
            evidence: { path: file.relativePath, detail: `missing=${resolvedRelative}` },
            fixability: "manual",
          });
        }
      }
    }

    return findings;
  },
};
