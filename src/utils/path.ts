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
