/**
 * Path Resolution Engine — Stage 1: prepare candidates for deterministic resolution.
 *
 * Shared infrastructure. Future stages add lattice resolution; Stage 1 only:
 * - concrete-only filtering
 * - URI decoding
 * - path normalization
 *
 * No repository-specific or framework-specific logic.
 */

export type PathConcreteRejectReason =
  "empty" | "placeholder" | "ellipsis" | "home" | "git-ref" | "bundler-module-type" | "undecodable";

export type PreparedPathReference =
  | {
      status: "concrete";
      /** Raw reference as extracted from source text. */
      original: string;
      /** Decoded, separator-normalized form used for resolution/existence checks. */
      normalized: string;
    }
  | {
      status: "reject";
      original: string;
      reason: PathConcreteRejectReason;
    };

/** Angle-bracket or `{name}` template slots — intentional non-paths. */
const PLACEHOLDER_TOKEN = /(?:<[^<>\s]+>|\{[A-Za-z_][A-Za-z0-9_]*\})/;

/** Ellipsis segments used as documentation wildcards (`bases/base/...`). */
const ELLIPSIS_SEGMENT = /(^|\/)\.\.\.(\/|$)/;

/**
 * Git-ref shaped tokens that appear in backticks but are not filesystem paths.
 * Kept narrow: remote refs + conventional-commit branch prefixes.
 * Does not treat `docs/` as a branch prefix (collides with documentation trees).
 * Branch-like prefixes are ignored when the reference ends with a file extension.
 */
const REMOTE_REF_SHAPE = /^(?:origin|upstream|HEAD)\/[A-Za-z0-9._/-]+$/;
const BRANCH_PREFIX_SHAPE = /^(?:feature|fix|chore|hotfix|release)\/[A-Za-z0-9._/-]+$/;
const FILE_EXTENSION_SUFFIX = /\.[A-Za-z0-9]{1,16}$/;

function looksLikeGitRef(normalized: string): boolean {
  if (REMOTE_REF_SHAPE.test(normalized)) {
    return true;
  }
  if (!BRANCH_PREFIX_SHAPE.test(normalized)) {
    return false;
  }
  // `fix/login.ts` is a path; `fix/bug-in-worker-threads` is a branch token
  return !FILE_EXTENSION_SUFFIX.test(normalized);
}

/**
 * Bundler module-type tokens (`asset/resource`, `javascript/auto`) — not paths.
 * Generalized type/name pattern; no bundler product names.
 */
const BUNDLER_MODULE_TYPE =
  /^(?:asset|javascript|css|json|wasm|webassembly|runtime)\/[A-Za-z0-9_-]+$/;

/**
 * Normalize a path reference for filesystem checks:
 * URI-decode percent-encoding, unify separators to `/`.
 * Does not decide concreteness.
 */
export function normalizePathReference(raw: string): string | null {
  if (!raw) {
    return null;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return decoded.replace(/\\/g, "/");
}

function concretenessRejectReason(normalized: string): PathConcreteRejectReason | null {
  if (!normalized) {
    return "empty";
  }
  if (PLACEHOLDER_TOKEN.test(normalized)) {
    return "placeholder";
  }
  if (ELLIPSIS_SEGMENT.test(normalized)) {
    return "ellipsis";
  }
  if (normalized === "~" || normalized.startsWith("~/") || normalized.startsWith("~\\")) {
    return "home";
  }
  if (looksLikeGitRef(normalized)) {
    return "git-ref";
  }
  if (BUNDLER_MODULE_TYPE.test(normalized)) {
    return "bundler-module-type";
  }
  return null;
}

/**
 * Stage 1 entry point: filter non-concrete references and normalize survivors.
 */
export function preparePathReference(raw: string): PreparedPathReference {
  const original = raw;
  if (!original || !original.trim()) {
    return { status: "reject", original, reason: "empty" };
  }

  const normalized = normalizePathReference(original.trim());
  if (normalized === null) {
    return { status: "reject", original, reason: "undecodable" };
  }

  const reason = concretenessRejectReason(normalized);
  if (reason) {
    return { status: "reject", original, reason };
  }

  return { status: "concrete", original, normalized };
}

export function isConcretePathReference(raw: string): boolean {
  return preparePathReference(raw).status === "concrete";
}
