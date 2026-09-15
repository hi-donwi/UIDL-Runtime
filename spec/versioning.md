# Versioning — UIDL documents and the spec that reads them

*Status: **Approved** for spec 1.x.*

## The two versions

| Version | What it numbers | Example | Changes |
|---|---|---|---|
| **Spec version** (`UIDL_SPEC_VERSION`) | The `spec/` snapshot itself: semantics + schemas | `1.0` | Only when the spec changes |
| **Document version** (`document.version`) | The contract a given document was written against | `"1.0"` | Per document, written by the producer |

They are deliberately decoupled from **implementation versions** (e.g. the reference
runtime's own release line, `1.1.0`). The spec and its implementations have different
lifecycles: a document and a runtime can each be old or new independently, and the
`version` rules below decide whether they interoperate.

## Document version rules

1. A document **must** declare `"version"` as a string. The canonical form is
   `major.minor` (pattern `^[0-9]+\.[0-9]+$`). A third **patch** component
   (`1.0.0`) is **tolerated and ignored** — pre-spec documents shipped it, and
   rejecting them would be a behavioural break, so consumers accept it while new
   documents should use `major.minor`. Any other malformed or non-string version is
   a `DOCUMENT_VALIDATION` error to any consumer that validates.
2. **Same major, compatible minor → accept.** A runtime implementing spec `1.0`
   accepts documents `1.x` for any `x ≥ 0`. A newer minor is a promise of additive
   features that, if missing, render to a graceful fallback rather than failing.
3. **Different major → reject.** A document carrying `2.0` (or `0.x`) was produced
   against a different contract. The reference runtime rejects it with
   `UNSUPPORTED_VERSION` and never attempts a best-effort render of an unknown
   major.

The reference runtime enforces these at the render boundary: `createRenderContext`
(covering `renderUIDocument` and `UIDocumentRenderer`) calls
`assertSupportedDocumentVersion`, which throws `DocumentVersionError` carrying the
stable code (`UNSUPPORTED_VERSION` / `MALFORMED_VERSION`) — see
`packages/core/src/version.ts` and the active `error`-class conformance cases.
4. A document may also carry `spec` metadata in the `metadata` block (free-form);
   it is informational and does not override `version`.

## Spec version rules (how this repository changes)

- **Minor bumps** (e.g. `1.0` → `1.1`) are **additive**: new operators, new scopes,
  new optional schema keywords, new accepted grammar — never a behaviour change to
  something already specified.
- **Minor bumps never change the `version` contract**: documents that were valid on
  `1.0` remain valid, and their meaning is unchanged.
- **Major bumps** (e.g. `1.x` → `2.0`) may remove or **redefine** existing
  semantics. This is exactly the transition documents cannot cross implicitly, and
  the reason the reference runtime hard-rejects an unknown major.
- A constant changes (new constant for `1.1`) is data, not a semantic change; the
  constant value is observed by no rule.

## Rejection vocabulary

A consumer that cannot render a document because of its version must report a
**versioning error**, one of:

| Code | Meaning |
|---|---|
| `UNSUPPORTED_VERSION` | A document whose major is not implemented |
| `MALFORMED_VERSION` | A document whose version fails the `major.minor` shape |

Nothing else. A runtime never downgrades to "guess the intent" — rejecting loudly is
the only safe behaviour for an unknown major. `MALFORMED_VERSION` is raised by
schema-validating consumers and (in the reference runtime) by the render-boundary
version guard for a version that goes through without validation.