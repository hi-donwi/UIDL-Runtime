# Error taxonomy — how implementations report failure

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0002-error-taxonomy-approved.md`.
Model: `packages/core/src/errors/errors.ts` (the canonical `ERROR_CODES` constants)
and `spec/schema/errors.schema.json` (the catalog). The delivery envelope
(HTTP/problem-json) is the transport's concern, not the UI's.*

Every condition an implementation can report has a stable **error code** — a
uppercase snake-case string — belonging to a **class**. Codes never change meaning
and are never repurposed; new codes are additive minors. Implementations map each
code to an `ErrorCode` value and must not invent codes.

## Classes and codes

| Class | Codes | Raised when |
|---|---|---|
| **version** | `UNSUPPORTED_VERSION`, `MALFORMED_VERSION` | Document `version` cannot be honoured (versioning.md) |
| **validation** | `DOCUMENT_VALIDATION`, `VALIDATION`, `UNSUPPORTED_EVENT`, `UNSUPPORTED_COMPONENT` | A document fails schema/structure rules, names an unsupported event, or names an unknown component |
| **state** | `INVALID_STATE`, `UNKNOWN_ACTION` | A binding/action targets a missing or write-protected scope; an action type is not registered |
| **data** | `DATA` | A query fetch failed (queries.md — no partial rows, `data` stays undefined) |
| **navigation** | `NAVIGATION` | A targeted route is not resolvable |
| **auth** | `UNAUTHORIZED`, `FORBIDDEN` | Session/auth middleware rejects the request (security concern, surfaced as codes only) |
| **runtime** | `RUNTIME`, `RENDER` | Unexpected internal failure; structured render pipeline failure |

## Guarantees

1. **Stable and additive.** `UNKNOWN_ACTION` is always `UNKNOWN_ACTION` across
   versions; adding a code never removes an old one in a minor bump.
2. **Surface, don't swallow.** A rendering pipeline that catches an exception
   re-emits it with a code (defaulting to `RUNTIME`) so the template can branch on
   the class — silent `undefined` is reserved for *missing data and missing keys*,
   never for a broken action. In the reference runtime, action failures are
   observable both as a dev-time `console.warn` (`ActionInterpreter.execute`) and —
   deterministically — as an `ActionReport` from `ActionInterpreter.run` (actions.md).
   An action matching no known kind raises `UNKNOWN_ACTION`, never a silent no-op.
3. **Codes are data.** An implementation may expose them through any transport
   (HTTP status mapping, headers, log lines); the **code string** is the stable
   identifier, the transport mapping is not.
4. **A document can branch on class.** Templates may bind error visibility to a
   class-level code (e.g. show a retry UI on `DATA`, corrupt the frame on
   `DOCUMENT_VALIDATION`) — the vocabulary above is the union of branches a template
   may meaningfully rely on.

## Conformance

An implementation is conformant when, for the same faulty input, it surfaces the
**same code** as the reference runtime. The active conformance suites cover
`expression`, `binding`, `condition`, `action`, and `error` — document validation
(`DOCUMENT_VALIDATION`), the version guard (`UNSUPPORTED_VERSION`/`MALFORMED_VERSION`),
and the action guard (`UNKNOWN_ACTION` via `ActionInterpreter.run`).