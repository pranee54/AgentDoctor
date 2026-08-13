export class QueryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "QueryError";
    this.code = code;
  }
}

export class QueryValidationError extends QueryError {
  constructor(message: string) {
    super("QUERY_VALIDATION", message);
    this.name = "QueryValidationError";
  }
}

export class QueryNotFoundError extends QueryError {
  constructor(message: string) {
    super("QUERY_NOT_FOUND", message);
    this.name = "QueryNotFoundError";
  }
}

export class QueryUnsupportedError extends QueryError {
  constructor(message: string) {
    super("QUERY_UNSUPPORTED", message);
    this.name = "QueryUnsupportedError";
  }
}
