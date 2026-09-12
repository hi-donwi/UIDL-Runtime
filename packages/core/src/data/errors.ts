/**
 * A single failure shape both `InMemoryAdapter` and `HttpAdapter` are required to raise for the
 * same situation (record missing, bad input, stale version, no permission, network/timeout, or
 * server fault). A document/host that branches on `.code` behaves identically no matter which
 * adapter is wired in — that's the whole point of the seam: switching mock → HTTP must not
 * surface a failure mode the UI has never seen.
 */
export type DataErrorCode =
  | "not_found"
  | "validation"
  | "conflict"
  | "forbidden"
  | "network"
  | "timeout"
  | "server";

export class DataError extends Error {
  readonly code: DataErrorCode;
  /** Per-field messages, e.g. from server-side validation — maps directly to `state.formErrors.*`. */
  readonly fields?: Record<string, string>;

  constructor(message: string, code: DataErrorCode, fields?: Record<string, string>) {
    super(message);
    this.name = "DataError";
    this.code = code;
    this.fields = fields;
  }
}

export function isDataError(value: unknown): value is DataError {
  return value instanceof DataError;
}
