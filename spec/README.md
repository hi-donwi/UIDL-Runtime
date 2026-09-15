# UIDL — Declarative UI Document Language

This repository hosts **two things**: the **UIDL specification** (this `spec/` directory)
and a **reference runtime** (`uidl-runtime` npm package, under `packages/`). A UIDL
document is a renderer-agnostic data structure describing a screen: layout, state,
data, and behaviour, with no component library or framework assumed.

The runtime implements the spec. The spec is the contract both sides answer to:
any renderer that follows `spec/semantics/` and validates documents against
`spec/schema/` produces the same screen for the same document.

## What the spec covers

| Area | Documents the reader should model | Files |
|---|---|---|
| Document & nodes | The top-level document, its node tree, styles, props | `schema/document.schema.json`, `schema/node.schema.json`, `semantics/style.md` |
| Expressions | How bindings and computed values evaluate | `semantics/expressions.md`, `semantics/bindings.md` |
| Data | Reading data into scope, and mutating it | `semantics/queries.md`, `semantics/mutations.md` |
| Behaviour | Events, navigation, state transitions, actions | `semantics/events.md`, `semantics/actions.md`, `semantics/navigation.md`, `semantics/lifecycle.md` |
| State | Where variables live and how scope is assembled | `semantics/state.md` |
| Errors | The error taxonomy every implementation surfaces | `semantics/errors.md` |
| Versioning | How documents and the spec version together | `versioning.md` |

## Stability and statuses

Every file in `spec/` carries a `Status` line in its heading.

- **`Planned`** — described but not yet defined tightly enough to implement against.
- **`Draft`** — defined closely enough to implement; details may still change.
- **`Approved`** — frozen for spec `1.x`; changes need an ADR.
- **`Deprecated`** — still valid but scheduled for removal in a future major.

The `expression`, `binding`, `navigation` (route params only), `versioning`,
`mutations`, `errors`, `events`, `state`, `queries`, `actions` (twelve fixed kinds,
`download` and `query` included; extension actions carved out), and `lifecycle` files
are **`Approved`** for spec 1.x; the runtime already implements them all.
`style` remains **`Draft`**.

## Reading order

1. `versioning.md` — version model and compatibility rules.
2. `semantics/state.md` — the five render scopes and how scope is assembled.
3. `semantics/bindings.md` — the `$bind` path grammar.
4. `semantics/expressions.md` — the expression grammar and operator semantics.
5. The rest as needed.

## Spec versions

- **Spec version:** the current `spec/` snapshot answers to `UIDL_SPEC_VERSION`
  (`packages/core/src/version.ts`). It is `major.minor` and documented in `versioning.md`.
- **Schema `$id`s** follow `https://uidl.dev/schema/v1/…`. These identifiers are names,
  never fetch targets; a validating JSON-Schema implementation calls no network.
- **Document `version`** must satisfy the `version` schema and the rules in
  `versioning.md`. `1.0` is the only version this runtime accepts today; unknown
  concurrent majors are rejected with `UNSUPPORTED_VERSION`, concurrent minors are
  accepted (additive).

## Conformance

`conformance/` holds machine-checkable cases: one JSON file per behaviour, an expected
value, and (for active classes) a null-context evaluation. The reference runtime runs
the active cases as tests. `scripts/validate-spec.mjs` checks every schema file, the
real shipped documents, and the conformance fixtures against the schema registry.

Not yet covered by conformance: component model and guided rendering strategy (both
planned), plus lifecycle — Approved but behavioural (an ordering, not a null-context
value); its checkable pieces ride on the version guard and the `navigate`/`action`
schema cases.

## Relationship to the reference runtime

- Everything in this `spec/` directory is the neutral contract.
- `packages/core` implements it; `packages/react-native` and `packages/templates`
  consume `packages/core`.
- Implementation details, CLI commands, and release mechanics live in `docs/`, not here.