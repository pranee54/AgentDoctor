import path from "node:path";

/**
 * Resolve and normalize a user-supplied path safely.
 * Rejects empty strings; does not follow symlinks here.
 */
export function resolveRepoRoot(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (!trimmed) {
    throw new Error("Path must not be empty");
  }
  return path.resolve(trimmed);
}

/**
 * Produce a POSIX-style relative path for stable cross-platform reporting.
 */
export function toPosixRelative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

/**
 * Normalize a repository-relative path to POSIX form without regex backtracking.
 * Converts `\` to `/` and strips leading/trailing `/`.
 */
export function toRepoRelativePosix(relativePath: string): string {
  const value = relativePath.includes("\\") ? relativePath.split("\\").join("/") : relativePath;
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 47) {
    start += 1;
  }
  while (end > start && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}

/**
 * Ensure a candidate path stays within a root (defense against traversal).
 */
export function isPathInsideRoot(root: string, candidate: string): boolean {
  const normalizedRoot = path.resolve(root);
  const normalizedCandidate = path.resolve(candidate);
  if (normalizedCandidate === normalizedRoot) {
    return true;
  }
  const relative = path.relative(normalizedRoot, normalizedCandidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Strip ANSI / control characters from strings destined for JSON or logs.
 */
export function sanitizeForOutput(value: string): string {
  // eslint-disable-next-line no-control-regex -- intentional control-char stripping
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
