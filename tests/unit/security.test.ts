import { describe, expect, it } from "vitest";

import { isPathInsideRoot, sanitizeForOutput, toPosixRelative } from "../../src/utils/path.js";
import {
  looksLikeSensitiveFilename,
  redactSecretValue,
  sanitizeTerminalText,
} from "../../src/security/redaction.js";

describe("path utils", () => {
  it("converts relative paths to posix", () => {
    expect(toPosixRelative("/repo", "/repo/src/a.ts")).toBe("src/a.ts");
  });

  it("detects path traversal attempts", () => {
    expect(isPathInsideRoot("/repo", "/repo/src")).toBe(true);
    expect(isPathInsideRoot("/repo", "/etc/passwd")).toBe(false);
    expect(isPathInsideRoot("/repo", "/repo/../outside")).toBe(false);
  });

  it("strips control characters", () => {
    expect(sanitizeForOutput("hello\u0007world")).toBe("helloworld");
  });
});

describe("security redaction", () => {
  it("never returns the secret value", () => {
    expect(redactSecretValue("SUPER_SECRET")).toBe("[REDACTED]");
  });

  it("flags sensitive filenames", () => {
    expect(looksLikeSensitiveFilename(".env")).toBe(true);
    expect(looksLikeSensitiveFilename(".env.local")).toBe(true);
    expect(looksLikeSensitiveFilename("id_rsa")).toBe(true);
    expect(looksLikeSensitiveFilename("readme.md")).toBe(false);
  });

  it("sanitizes terminal text", () => {
    expect(sanitizeTerminalText("a\u001Bb")).toBe("ab");
  });
});
