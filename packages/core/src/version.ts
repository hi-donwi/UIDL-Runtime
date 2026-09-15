import { ERROR_CODES } from "./errors/errors";
import { defaultRegistry } from "./registry/registry";

export const UIDL_RUNTIME_VERSION = "1.1.0";

/**
 * The UIDL *document* specification version this runtime implements (`major.minor`).
 * Distinct from `UIDL_RUNTIME_VERSION` (the runtime's own release line) — this is the
 * protocol version carried in `document.version` (see `spec/versioning.md`). A document
 * whose major does not match is rejected as `UNSUPPORTED_VERSION`.
 */
export const UIDL_SPEC_VERSION = "1.0";

// ---------------------------------------------------------------------------
// Document version guard — the versioning contract from spec/versioning.md.
// Canonical form is `major.minor`; a third patch component (`1.0.0`) is tolerated
// (ignored) so pre-spec documents keep validating. A document whose major does not
// match UIDL_SPEC_VERSION cannot render (UNSUPPORTED_VERSION); any other malformed
// version is MALFORMED_VERSION. Both are detections, not best-effort guesses.
// ---------------------------------------------------------------------------

export const DOCUMENT_VERSION_PATTERN = /^(\d+)\.(\d+)(\.\d+)?$/;

export type DocumentVersionStatus = "supported" | "unsupported" | "malformed";

export interface DocumentVersionReport {
  status: DocumentVersionStatus;
  /** Present when `status` is `supported` or `unsupported`. */
  major?: number;
  /** Present when `status` is `supported`. */
  minor?: number;
  /** The originally supplied value, for diagnostics. */
  raw: unknown;
}

/**
 * Parses `document.version` against the versioning contract without rendering.
 * Deterministic and non-throwing: anything that cannot be parsed is `malformed`,
 * a major that does not match `UIDL_SPEC_VERSION` is `unsupported`.
 */
export function reportDocumentVersion(version: unknown): DocumentVersionReport {
  if (typeof version !== "string") {
    return { status: "malformed", raw: version };
  }
  const match = DOCUMENT_VERSION_PATTERN.exec(version);
  if (!match) {
    return { status: "malformed", raw: version };
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const supported = Number(UIDL_SPEC_VERSION.split(".")[0]);
  if (major !== supported) {
    return { status: "unsupported", major, raw: version };
  }
  return { status: "supported", major, minor, raw: version };
}

/** Raised by `assertSupportedDocumentVersion`; carries the stable error code. */
export class DocumentVersionError extends Error {
  readonly code: (typeof ERROR_CODES)["UNSUPPORTED_VERSION" | "MALFORMED_VERSION"];
  readonly report: DocumentVersionReport;

  constructor(report: DocumentVersionReport) {
    const code =
      report.status === "unsupported" ? ERROR_CODES.UNSUPPORTED_VERSION : ERROR_CODES.MALFORMED_VERSION;
    super(
      code === ERROR_CODES.UNSUPPORTED_VERSION
        ? `[uidl-runtime] Document version ${report.raw} has major ${report.major}; this runtime implements UIDL spec ${UIDL_SPEC_VERSION} (${code})`
        : `[uidl-runtime] Document version ${JSON.stringify(report.raw)} is malformed; expected major.minor like "${UIDL_SPEC_VERSION}" (${code})`,
    );
    this.name = "DocumentVersionError";
    this.code = code;
    this.report = report;
  }
}

/**
 * Enforces the version contract at the render boundary: throws `DocumentVersionError`
 * for a document that cannot render by version (`UNSUPPORTED_VERSION` for a major
 * mismatch, `MALFORMED_VERSION` otherwise); returns the report for a supported
 * document. Call this before any best-effort render of an unknown-major document.
 */
export function assertSupportedDocumentVersion(version: unknown): DocumentVersionReport {
  const report = reportDocumentVersion(version);
  if (report.status !== "supported") throw new DocumentVersionError(report);
  return report;
}

export type RegistryVersion = {
  version: string;
  componentCount: number;
  components: string[];
};

export function computeRegistryVersion(): RegistryVersion {
  const widgets = defaultRegistry.list();
  return {
    version: UIDL_RUNTIME_VERSION,
    componentCount: widgets.length,
    components: widgets.map((w) =>
      `${w.type}:${w.propDescriptors?.map((p) => p.name).join(",")}:${w.eventDescriptors?.map((e) => e.name).join(",")}`,
    ),
  };
}

export const REGISTRY_VERSION: RegistryVersion = computeRegistryVersion();

export function getRegistryVersion(): RegistryVersion {
  return REGISTRY_VERSION;
}

export function getRegistryFingerprint(): string {
  return REGISTRY_VERSION.components.join("\n");
}
