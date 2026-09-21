import { describe, expect, it } from "vitest";
import { ERROR_CODES, ERROR_CODE_VALUES } from "../errors";
import type { ErrorCode } from "../errors";

describe("ERROR_CODES", () => {
  it("defines exactly the documented vocabulary", () => {
    expect([...ERROR_CODE_VALUES].sort()).toEqual(
      [
        "UNSUPPORTED_VERSION",
        "MALFORMED_VERSION",
        "DOCUMENT_VALIDATION",
        "VALIDATION",
        "UNSUPPORTED_EVENT",
        "UNSUPPORTED_COMPONENT",
        "INVALID_STATE",
        "UNKNOWN_ACTION",
        "DATA",
        "NAVIGATION",
        "UNAUTHORIZED",
        "FORBIDDEN",
        "RUNTIME",
        "RENDER",
      ].sort(),
    );
  });

  it("exposes an ErrorCode type that all keys satisfy", () => {
    const sample: ErrorCode[] = [
      ERROR_CODES.DOCUMENT_VALIDATION,
      ERROR_CODES.UNKNOWN_ACTION,
    ];
    expect(sample).toHaveLength(2);
  });
});