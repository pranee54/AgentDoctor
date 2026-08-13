export type BrainMcpErrorCode =
  | "invalid_root"
  | "path_escape"
  | "brain_not_found"
  | "brain_corrupt"
  | "unsupported_query"
  | "invalid_argument"
  | "not_found"
  | "read_only"
  | "internal";

export class BrainMcpError extends Error {
  readonly code: BrainMcpErrorCode;

  constructor(code: BrainMcpErrorCode, message: string) {
    super(message);
    this.name = "BrainMcpError";
    this.code = code;
  }
}

export function toToolErrorPayload(error: unknown): {
  ok: false;
  error: { code: BrainMcpErrorCode | "unknown"; message: string };
} {
  if (error instanceof BrainMcpError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof Error) {
    const message = error.message;
    if (
      /checksum|corrupt|incompatible|contract|schema/i.test(message) ||
      error.name === "BrainStorageError" ||
      error.name === "BrainContractError"
    ) {
      return { ok: false, error: { code: "brain_corrupt", message } };
    }
    return { ok: false, error: { code: "internal", message } };
  }
  return { ok: false, error: { code: "unknown", message: "unknown error" } };
}
