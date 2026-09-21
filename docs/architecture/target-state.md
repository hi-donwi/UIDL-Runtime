# Target State — UIDL Platform

> Stage A deliverable. The north star from the master prompt (plan §34, §33), made
> concrete against this repository's seams. Every decision here must survive the
> guardrail question: *"Could the same UIDL document reasonably be rendered by React,
> Flutter, and Jetpack Compose?"*

## 1. Positioning

> A framework-agnostic, schema-driven UI protocol with native runtimes for Web,
> Flutter, and Android, backed by a shared semantic specification and a
> cross-runtime conformance suite.

UIDL is a **protocol/specification**, not a React library. React becomes a reference
runtime; it never owns the semantics.

```
UIDL Specification (spec/)
        ↓
Semantic Model (spec/semantics)
        ↓
Conformance Suite (conformance/)
        ↓
Native Runtimes (runtimes/…)
        ↓
React/Web · Flutter/iOS+Android · Compose/Android
```

## 2. Repository layout (target)

```
UIDL-Runtime/
├── spec/                  # THE contract: schemas + semantics + versioning
│   ├── schema/*.json      # document, node, expression, binding, query, mutation,
│   │                      # action, theme, extension, component, version
│   ├── semantics/*.md     # bindings, expressions, queries, mutations, actions,
│   │                      # state, events, navigation, lifecycle, versioning, errors
│   └── README.md
├── conformance/           # shared fixtures + expected results
│   ├── cases/<domain>/*.json
│   ├── expected/          # canonical expected outcomes
│   ├── fixtures/          # shared input data/context
│   └── README.md
├── runtimes/              # native implementations (each independent)
│   ├── react/             # refactored from packages/core renderer
│   ├── flutter/           # idiomatic Dart/Flutter
│   └── android-compose/   # idiomatic Kotlin/Jetpack Compose
├── server/                # (later) backend UIDL generation/serving contract
├── packages/core/         # keeps the Zod runtime + reference React machinery
├── apps/ e2e/ scripts/    # unchanged responsibilities
├── docs/
│   ├── architecture/
│   ├── specification/     # mirrors spec/ for humans
│   ├── runtime/           # per-runtime guides
│   ├── extension/
│   └── contributing/
└── README.md
```

Notes on adaptation to today's repo:

- `spec/` and `conformance/` are **new top-level directories**, owned by
  `packages/core` conceptually but living at the repo root because they are
  runtime-independent and are what a Dart or Kotlin build consumes.
- `runtimes/react` will be extracted from `packages/core/src` *in place*: the current
  package stays the published artifact while the direction is proven.
- Not a forced restructure-modulo-context: `docs/product` stays; `docs/architecture`
  (this dir) becomes the migration record.

## 3. The UIDL specification — target contracts

Every core concept gets (1) a JSON Schema, (2) a human-readable semantics doc,
(3) examples, (4) edge cases, (5) conformance tests.

| Concept | Schema file | Semantics doc | Status today |
|---|---|---|---|
| Document | `document.schema.json` | `document.md`, `versioning.md` | Zod only |
| Node | `node.schema.json` | `nodes.md` | Zod only |
| Component (semantic type) | `component.schema.json` | `components.md` | `WidgetManifest` only |
| Props / children | (in node) | `nodes.md` | implicit |
| Binding | `binding.schema.json` | `bindings.md` | `$bind` prefix list |
| Expression | `expression.schema.json` | `expressions.md` | evaluator, `z.unknown()` |
| Query | `query.schema.json` | `queries.md` | `DataAdapter.Query` TS |
| Mutation | `mutation.schema.json` | `mutations.md` | `mutate` action TS |
| Action | `action.schema.json` | `actions.md` | `ActionSchema` Zod |
| Event | (in node + action) | `events.md` | DOM-shaped |
| State | `document.state` + `setState` | `state.md` | Zustand store |
| Theme | `theme.schema.json` | `themes.md` | token maps |
| Extension | `extension.schema.json` | `extensions.md` | missing |
| Navigation | `navigation.schema.json` | `navigation.md` | `navigate` string/object |
| Version | `document.version` | `versioning.md` | opaque string |

## 4. Semantic model — what equivalence means

For the **same UIDL document + same input data + same context**, every runtime must
resolve the **same**:

- bindings (path resolution, missing/null/default/nested/collection access)
- expression results (deterministic; no arbitrary code)
- conditions and repeated collections (same membership, same order)
- queries (same descriptor → data lifecycle: loading/success/empty/error/retry)
- mutations and actions (same intent dispatch; host maps to implementation)
- navigation intents (same target + params)
- validation semantics and component identity
- state semantics (same store shape: `state.*`, `state.$data.<name>.*`)

Native output *may* differ where platform conventions require it (layout, density,
motion). Conformance asserts semantics, not pixels.

## 5. Rule set for the core spec (§2/§33 of the plan)

1. **Framework agnostic** — no hooks/JSX/DOM/CSS/browser/framework names in the spec.
2. **Native runtimes stay native** — idiomatic React/Flutter/Compose; never emulate one
   inside another.
3. **Semantic equivalence > implementation similarity.**
4. Platform-specific anything goes behind **extension / capability / host API / adapter**.
5. Expressions are **data, never code**. No arbitrary JS/Dart/Kotlin from UIDL.
6. UIDL is **untrusted input**: strict schema validation, bounded recursion,
   bounded collections, action allowlisting, predictable failure (plan §23).

## 6. Expression grammar (target, superset of today's)

Comparison: `eq neq gt gte lt lte`  ·  Boolean: `and or not`  ·  Arithmetic:
`add subtract multiply divide`  ·  String: `contains startsWith`  ·  Control:
`if coalesce`  ·  Aggregate: `sum count avg` (over a collection in scope)

Serialized as data. Today's evaluator uses `==`/`!=`/`??` keys; the spec introduces
aliases (`eq`/`neq`/`coalesce`) and the runtime keeps both during transition, then
normalizes.

## 7. Binding model (target)

Unified `$bind` path grammar with explicit scope prefixes and documented resolution
order and failure semantics:

- Document/render scope: `state.*`, `session.*`, `route.*`, `data.*`, `local.*`
  (repeat item), with `index`.
- Action/event scope: `event` and `event.<path>` (the value an event carried).
- One documented rule for missing vs. null vs. default — identical across runtimes.
- `BINDING_NOT_FOUND` shows a deterministic placeholder/error, never a crash.

## 8. Data lifecycle (target)

`read/write/subscribe` as a semantic contract. `$query` descriptors must carry
well-defined states: `loading`, `success`, `empty`, `error`, `cancelled`, `retry`,
`stale`, `refresh`. Document-level dedup/debounce lives in the runtime's data layer,
not in documents. No HTTP details in documents (plan §11/$12).

## 9. Actions & mutations (target)

- **UI intent** and **host implementation** separated: a `mutate` names an operation
  and collection; the host decides execution.
- Actions stay **fail-closed**: `api` allowlist, `mutate`/`command` handlers required.
- New deterministic error codes (§25): `INVALID_DOCUMENT, UNSUPPORTED_VERSION,
  INVALID_NODE, INVALID_EXPRESSION, BINDING_NOT_FOUND, DATA_SOURCE_ERROR,
  ACTION_NOT_SUPPORTED, EXTENSION_NOT_FOUND, UNSUPPORTED_COMPONENT`.

## 10. Component vocabulary (target)

Semantic identifiers, lowercase, name-agnostic: `container, row, column, text,
image, button, input, checkbox, switch, slider, select, textarea, form, list,
table, tabs, card, badge, icon, divider, space, link, dialog, snackbar, nav,
sidebar, toolbar`. Runtimes map each to native equivalents:

```
container → Column/Row/Container/etc. · text → Text · button → FilledButton
image → Image · input → TextField · list → ListView · table → DataTable
```

Current PascalCase widget types remain valid in v1 documents (compat aliases).

## 11. Versioning (target)

`"version": "1.0"`, `major.minor`. Major breaks compatibility; minor is backward
compatible. A `supportedVersions` range per runtime + a `UNSUPPORTED_VERSION` error.
Rules (plan §6): unknown fields ignored; unknown node types → explicit failure in a
defined place (not silent `null` in prod); unknown expressions fail; deprecated
properties documented with migration path.

## 12. Theme (target)

Semantic design tokens (`color.*`, `spacing.*`, `radius.*`, `typography.*`) mapped by
each runtime to its native theme system:

```
React → CSS/design system · Flutter → ThemeData · Compose → MaterialTheme
```

Web CSS concepts (tailwind classes, CSS custom properties) are **runtime mapping**,
not core spec.

## 13. Extensions (target)

`{"type": "extension", "name": "barcodeScanner"}` with identity/version/capabilities/
input/output schema/lifecycle/fallback. Unsupported extensions fail predictably
(`EXTENSION_NOT_FOUND` + documented fallback).

## 14. Conformance (target)

Shared fixtures; each case = `{input UIDL, input data/context, expected semantic
result}`. Every runtime must pass the same suite. Compatibility is **measured by
conformance**, not by demo screens.

## 15. Server direction (target, later stage)

Backend generates + validates + delivers UIDL: metadata → UIDL generator → UIDL
validator → UIDL JSON → React/Flutter/Compose. No Java UI renderer (plan §21).

## 16. Performance & observability (target)

Design for incremental evaluation, memoization, lazy render, virtualization, query
dedup, selective updates (plan §26). Optional per-node diagnostics: node ID →
binding → expression → data source → action (plan §24).

## 17. Non-goals (this refactor)

- **No** pseudo-frameworks. `runtimes/flutter` and `runtimes/android-compose` look
  native, not like React.
- **No** arbitrary code execution from UIDL, ever.
- **No** giant rewrite of working code; each migration slice keeps the repo green
  (see `migration-plan.md`).

## 18. Definition of done for the target state

The platform is complete when the React runtime is a **fully conformant reference
implementation**, Flutter and Compose runtimes pass the same suite, the server can
generate and validate documents, and AI output is validated before render —
with docs, tests, deterministic errors, and no platform concept leaked into
`spec/`.