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

/** Extensions accepted for bare filenames (no `/`) — precision over recall. */
const BARE_FILE_EXTENSION =
  /\.(mdc?|txt|tsx?|jsx?|mjs|cjs|json|ya?ml|toml|php|py|rb|go|rs|java|kt|css|scss|html|vue|svelte|sh|bash|zsh|sql|xml|svg|png|jpe?g|gif|webp|wasm|lock)$/i;

export type ResolvedPathReference =
  | {
      status: "ok";
      pathsToCheck: string[];
      primaryRelative: string;
    }
  | {
      status: "escape";
      attempted: string;
    };

function stripAnchor(value: string): string {
  return value.split("#")[0] ?? value;
}

function isExplicitRelativePath(value: string): boolean {
  return value.startsWith("./") || value.startsWith("../");
}

/**
 * Conservative local path classification for markdown links / backticks.
 * Precision is more important than recall for this rule.
 */
export function isLikelyLocalPathReference(value: string): boolean {
  if (!value || value.length > 200) return false;
  if (/^(https?:|mailto:|file:)/i.test(value)) return false;
  if (value.startsWith("#")) return false;
  if (value.startsWith("--")) return false;
  if (value.includes("://")) return false;
  if (value.includes("\n") || value.includes(" ")) return false;
  if (/[;&|$]/.test(value)) return false;
  if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) return false;
  // CSS class / id-like bare selectors: `.content`, `.button`
  if (/^\.[A-Za-z_][\w-]*$/.test(value)) return false;

  if (value.includes("/")) {
    // Reject empty segments like `foo//bar` while allowing trailing slash dirs
    const normalized = value.replace(/\/+$/, "");
    if (!normalized || normalized.split("/").some((part) => part === "")) {
      return false;
    }
    return true;
  }

  // Bare filename: require a known file extension (not `.content`-style tokens)
  return BARE_FILE_EXTENSION.test(value) && !value.startsWith(".");
}

export function extractPathCandidates(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
    const target = stripAnchor((match[1] ?? "").trim());
    if (isLikelyLocalPathReference(target)) {
      found.add(target);
    }
  }

  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const target = stripAnchor((match[1] ?? "").trim());
    if (isLikelyLocalPathReference(target)) {
      found.add(target);
    }
  }

  return [...found];
}

function isEscapingRepoRelative(relativePath: string): boolean {
  return relativePath === ".." || relativePath.startsWith("../");
}

/**
 * Resolve a candidate path reference with repository-aware semantics:
 * - `./` and `../` → relative to the instruction file directory
 * - otherwise → repository-root relative (avoids nesting under `.cursor/rules/`)
 */
export function resolveInstructionPathReference(
  instructionRelativePath: string,
  candidate: string,
): ResolvedPathReference {
  const instructionDir = path.posix.dirname(instructionRelativePath);

  if (isExplicitRelativePath(candidate)) {
    const joined =
      instructionDir === "."
        ? path.posix.normalize(candidate)
        : path.posix.normalize(path.posix.join(instructionDir, candidate));

    if (isEscapingRepoRelative(joined)) {
      return { status: "escape", attempted: joined };
    }

    return {
      status: "ok",
      pathsToCheck: [joined],
      primaryRelative: joined,
    };
  }

  const rootRelative = path.posix.normalize(candidate);
  if (isEscapingRepoRelative(rootRelative) || rootRelative.startsWith("/")) {
    return { status: "escape", attempted: rootRelative };
  }

  return {
    status: "ok",
    pathsToCheck: [rootRelative],
    primaryRelative: rootRelative,
  };
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
          const resolved = resolveInstructionPathReference(file.relativePath, candidate);

          if (resolved.status === "escape") {
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

          let exists = false;
          for (const relativePath of resolved.pathsToCheck) {
            const absolute = path.resolve(context.root, relativePath);
            if (!isPathInsideRoot(context.root, absolute)) {
              continue;
            }
            if (await pathExistsInsideRoot(context.root, relativePath)) {
              exists = true;
              break;
            }
          }

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
            evidence: {
              path: file.relativePath,
              detail: `missing=${resolved.primaryRelative}`,
            },
            fixability: "manual",
          });
        }
      }
    }

    return findings;
  },
};
