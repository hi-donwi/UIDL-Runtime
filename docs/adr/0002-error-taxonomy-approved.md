# ADR-0002: Approve the error taxonomy (errors.md)

* **Status:** Accepted (2026-09-15)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

`spec/semantics/errors.md` defines the stable error-code vocabulary for the runtime:
uppercase snake-case codes grouped by class (`version`, `validation`, `state`, `data`,
`navigation`, `auth`, `runtime`). The four guarantees (stable/additive, surface-don't-
swallow, codes-are-data, branch-on-class) and the conformance rule (same input → same
code as reference runtime) are all fully implemented and conformance-tested:

* `DocumentVersionError.code` is `"UNSUPPORTED_VERSION" | "MALFORMED_VERSION"`,
  enforced by `assertSupportedDocumentVersion` and three active conformance cases
  (`unsupported-version`, `malformed-version`).
* `UnknownActionError.code` is `"UNKNOWN_ACTION"`, raised by `ActionInterpreter.run`;
  conformance case `unknown-action` asserts the code via `ActionReport`.
* Three `DOCUMENT_VALIDATION` conformance cases validate bad documents at the harness
  level.
* The canonical constants now live in a single runtime source of truth:
  `packages/core/src/errors/errors.ts` (`ERROR_CODES`, `ErrorCode` type, exported via
  public barrel) — version.ts and interpreter.ts reference these constants directly.
* `spec/schema/errors.schema.json` catalogs every code; validate-spec compiles it.

The file's model references (`errors.ts`, `errors.schema.json`) did not previously
exist on disk — the codes were scattered across `version.ts` and `interpreter.ts`.
That gap has now been closed; the Approved status may proceed.

## Decision

**Approve `spec/semantics/errors.md` for spec 1.x.** The four guarantees, the code
table, and the conformance rule are frozen. The canonical runtime model
(`packages/core/src/errors/errors.ts`) and catalog schema
(`spec/schema/errors.schema.json`) are now the single source of truth. The delivery
envelope (HTTP/problem-json mapping, headers) remains the transport's concern and is
not in scope for this approval.

## Alternatives rejected

1. **Keep Draft until `DATA`/`NAVIGATION`/`auth` codes get a conformance class.**
   — The class-level codes are already the stable vocabulary; the adapter-level detail
   codes (`DataError.code`) are a different concern. The taxonomy itself does not
   depend on those runners existing yet.
2. **Merge errors.md into bindings.md or mutations.md.**
   — The error vocabulary is shared across all runtime surfaces; putting it in any
   one semantics file would be misleading.

## Consequences

* Other runtimes may now key on the exact `ERROR_CODES` strings without fear of a
  rename or repurpose.
* Adding a new code is an additive minor bump and requires updating
  `errors.ts`, `errors.schema.json`, and this document.
* `errors.md` transitions from Draft → **Approved** for spec 1.x.