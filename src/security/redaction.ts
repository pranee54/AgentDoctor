/**
 * Never print secret values. Report paths and risk only.
 */
export function redactSecretValue(_value: string): string {
  return "[REDACTED]";
}

/**
 * Strip control characters that could hijack terminal output.
 */
export function sanitizeTerminalText(value: string): string {
  // eslint-disable-next-line no-control-regex -- intentional control-char stripping
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

const SENSITIVE_BASENAME_PATTERNS = [
  /^\.env(\..+)?$/i,
  /.*credentials.*\.json$/i,
  /.*secret.*/i,
  /id_rsa$/i,
  /id_ed25519$/i,
  /\.pem$/i,
  /\.key$/i,
];

export function looksLikeSensitiveFilename(filename: string): boolean {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  return SENSITIVE_BASENAME_PATTERNS.some((pattern) => pattern.test(base));
}
