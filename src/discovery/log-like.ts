const LOG_LIKE = /\.(log|out|dump)$/i;
const HEAVY_NAME = /(^|\/)(debug|trace|coverage-final|chrome-devtools|heapdump)/i;

/** Path looks like a log/dump that can pollute agent context (size-only rules). */
export function isLogLikePath(relativePath: string): boolean {
  const base = relativePath.split("/").pop() ?? relativePath;
  return LOG_LIKE.test(base) || HEAVY_NAME.test(relativePath);
}
