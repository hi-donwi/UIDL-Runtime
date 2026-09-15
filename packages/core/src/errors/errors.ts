/**
 * The stable error-code vocabulary of the UIDL spec — `spec/semantics/errors.md`
 * (Approved, ADR-0002). Codes never change meaning and are never repurposed; adding
 * a code is an additive minor. Implementations that surface codes must use these
 * exact strings and must not invent new ones.
 */
export const ERROR_CODES = {
  UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION",
  MALFORMED_VERSION: "MALFORMED_VERSION",
  DOCUMENT_VALIDATION: "DOCUMENT_VALIDATION",
  VALIDATION: "VALIDATION",
  UNSUPPORTED_EVENT: "UNSUPPORTED_EVENT",
  UNSUPPORTED_COMPONENT: "UNSUPPORTED_COMPONENT",
  INVALID_STATE: "INVALID_STATE",
  UNKNOWN_ACTION: "UNKNOWN_ACTION",
  DATA: "DATA",
  NAVIGATION: "NAVIGATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RUNTIME: "RUNTIME",
  RENDER: "RENDER",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Every code the spec defines, in a form validators and catalogs can consume. */
export const ERROR_CODE_VALUES: readonly ErrorCode[] = [
  ...new Set(Object.values(ERROR_CODES)),
];