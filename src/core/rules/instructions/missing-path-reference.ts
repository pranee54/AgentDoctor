import path from "node:path";

import { pathExistsInsideRoot } from "../../../agents/inspect.js";
import { preparePathReference } from "../../path-resolution/index.js";
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

/** Host-like first segments for Go/npm module paths (`github.com/…`, `golang.org/…`). */
const MODULE_HOST_SEGMENT =
  /^(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|ai|app|cloud|co|edu|gov|info|me|tv|xyz|in|to|cc)$/i;

/** Control-flow / language tokens that appear as `a/b` in prose, not filesystem paths. */
const CODE_SLASH_TOKEN = /^(?:try\/finally|if\/else|for\/of|for\/in|async\/await|do\/while)$/i;

/**
 * First path segment of Go standard-library import paths (`io/ioutil`, `net/http`).
 * Kept narrow so `src/utils`-style repo paths still validate.
 */
const GO_STDLIB_ROOTS = new Set([
  "archive",
  "bufio",
  "bytes",
  "cmp",
  "compress",
  "container",
  "context",
  "crypto",
  "database",
  "debug",
  "embed",
  "encoding",
  "errors",
  "expvar",
  "flag",
  "fmt",
  "go",
  "hash",
  "html",
  "image",
  "index",
  "io",
  "log",
  "maps",
  "math",
  "mime",
  "net",
  "os",
  "path",
  "plugin",
  "reflect",
  "regexp",
  "runtime",
  "slices",
  "structs",
  "sync",
  "syscall",
  "testing",
  "text",
  "time",
  "unicode",
  "unique",
  "unsafe",
  "weak",
]);

/** Optional build-output roots often documented before `npm run build`. */
const OPTIONAL_BUILD_ROOTS = new Set(["dist", "build", "out", "target", ".next", "coverage"]);

function isGoStdImportPath(normalized: string): boolean {
  const parts = normalized.split("/");
  if (parts.length < 2 || parts.length > 4) {
    return false;
  }
  const root = parts[0] ?? "";
  if (!GO_STDLIB_ROOTS.has(root)) {
    return false;
  }
  return parts.every((part) => /^[a-z][a-z0-9]*$/.test(part));
}

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
  // npm scoped packages: `@scope/name`
  if (/^@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(value)) return false;
  // Glob / brace patterns are not concrete paths
  if (/[*?[\]{}]/.test(value)) return false;
  // Language tokens that look like paths (`try/finally`)
  if (CODE_SLASH_TOKEN.test(value)) return false;

  const withoutDotSlash = value.replace(/^\.\//, "");
  const trimmedDir = withoutDotSlash.replace(/\/+$/, "");
  // Documented build outputs often missing until a local build
  if (OPTIONAL_BUILD_ROOTS.has(trimmedDir)) return false;

  if (value.includes("/")) {
    const normalized = value.replace(/\/+$/, "");
    if (!normalized || normalized.split("/").some((part) => part === "")) {
      return false;
    }
    const firstSegment = normalized.split("/")[0] ?? "";
    // Go/npm module imports: `github.com/foo/bar`, `golang.org/x/…`
    if (MODULE_HOST_SEGMENT.test(firstSegment)) {
      return false;
    }
    // Go stdlib: `io/ioutil`, `net/http`, `path/filepath`
    if (isGoStdImportPath(normalized)) {
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
 * - otherwise → repository-root relative, plus the same path under the
 *   instruction file directory when nested (monorepo package docs)
 *
 * Does not search sibling packages: a root `AGENTS.md` reference must still
 * exist at the repository root (or via `./` / `../`).
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

  const pathsToCheck = [rootRelative];

  if (instructionDir !== ".") {
    const fromInstruction = path.posix.normalize(
      path.posix.join(instructionDir, rootRelative),
    );
    if (
      !isEscapingRepoRelative(fromInstruction) &&
      !fromInstruction.startsWith("/") &&
      fromInstruction !== rootRelative
    ) {
      pathsToCheck.push(fromInstruction);
    }
  }

  return {
    status: "ok",
    pathsToCheck,
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
          const prepared = preparePathReference(candidate);
          if (prepared.status === "reject") {
            continue;
          }

          const resolved = resolveInstructionPathReference(
            file.relativePath,
            prepared.normalized,
          );

          if (resolved.status === "escape") {
            findings.push({
              ruleId: "instructions/missing-path-reference",
              category: "instructions",
              severity: "warning",
              title: "Instruction references a missing path",
              message: `${file.relativePath} references \`${prepared.original}\`, which escapes the repository root`,
              whyItMatters:
                "Path references outside the repository cannot be validated and may confuse agents.",
              recommendation: "Use repository-relative paths only.",
              affectedAgents: context.agents
                .filter((a) => a.configPaths.includes(file.relativePath))
                .map((a) => a.id),
              evidence: { path: file.relativePath, detail: `ref=${prepared.original}` },
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
            message: `${file.relativePath} references \`${prepared.original}\`, but that path does not exist`,
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
