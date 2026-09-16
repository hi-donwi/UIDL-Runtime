# Migration Plan — from React runtime to UIDL Platform

> Stage A deliverable. Ordered slices (plan §30) that take `current-state.md` to
> `target-state.md`. Follow the exact strategic sequence unless technical evidence
> says otherwise. Every slice keeps the repo green (`npm test`, `npm run typecheck`,
> `npm run build`) and preserves the public API listed in `current-state.md §9`.

## Sequencing at a glance

| Stage | Deliverable | Landmark |
|---|---|---|
| A | `docs/architecture/{current,target,migration-plan}.md` | ✅ (refresh 2026-09-16) |
| B | `spec/` JSON schemas + docs + versioning | ✅ |
| C | `spec/semantics/*.md` (formal semantics) | ✅ Approved for 1.x |
| D | `conformance/` shared fixtures | ✅ 55 cases; action/render still shallow |
| E | React runtime → full conformance | ✅ schema-level for actions |
| F–G | Flutter runtime + conformance | ✅ `runtime-flutter/` (10 widgets) |
| H–I | Compose runtime + conformance | ✅ `runtime-android/` semantic core; **next** = `Column`/`Text` tree + further widgets |
| J | Server-side UIDL generation contracts | ✅ `server/uidl-generator`, `server/uidl-server` |
| K | AI UIDL generation + validation pipeline | ✅ `aiPipeline.ts` |
| L | Performance, security, docs, ecosystem | ✅ telemetry + benches; no new telemetry without a consumer |

Do **not** restructure onto `runtimes/flutter` / `runtimes/android-compose` as a
prerequisite. The directories `runtime-flutter/` and `runtime-android/` already
exist. Next native proof is rendering `conformance/cases/render/text-column.json`
on Compose (host-agnostic tree in the JVM harness), then Button + setState.

## Slice B1 — Spec scaffold + versioning (this run)

**Goal:** `spec/` becomes the neutral contract; `version` becomes meaningful.

- Add `spec/README.md` (what the spec is, how to read it, guardrail §33).
- Add `versioning.md` + `version.json`-style version rules; define `major.minor`,
  compatibility rules, unknown-field & deprecated-property handling.
- Introduce the **UIDL spec version constant** (`UIDL_SPEC_VERSION = "1.0"`) in
  `version.ts` (additive export — public API unchanged).
- Keep `DocumentSchema.version: string` but add a `supportedVersions: ["1.x"]`
  runtime check behind a non-breaking validation function (separate slice E if it
  must touch validation paths).

## Slice B2 — Extract JSON Schemas

**Goal:** a Dart/Kotlin/AI-consumable JSON Schema (draft 2020-12) tree under
`spec/schema/`, derived from the authoritative Zod schemas.

- `document.schema.json`, `node.schema.json`, `expression.schema.json`,
  `binding.schema.json`, `query.schema.json`, `mutation.schema.json`,
  `action.schema.json`, `theme.schema.json`, `component.schema.json`,
  `version.schema.json`.
- Implementation: extend `scripts/generate-json-schema.mjs` (or a new
  `scripts/generate-uidl-spec.mjs`) to also emit `spec/schema/*.json`. **The Zod
  source stays authoritative**; the spec files are generated + committed so
  Dart/Kotlin builds and AI validation do not depend on TypeScript.
- Wire into `npm run build` (extend `build:schema`) so the spec never drifts.
- `spec/schema` files must pass `bin/validate.mjs` against a canonical document.

## Slice C — Formal semantics (with/after B)

**Goal:** semantics docs that define what "the same result" means per concept.

- `spec/semantics/*.md`: bindings, expressions, queries, mutations, actions, state,
  events, navigation, lifecycle, versioning, errors.
- Each doc: definition, examples, edge cases, error codes, conformance-case links.
- Document the **event value contract** (the semantic payload a widget emits on
  change/action — the thing that is NOT a DOM event), so Flutter/Compose implement
  the same intent.
- Choose and freeze one serialization for the expression grammar. Adopt
  `{"$expr": {"op": "gt", "left": ..., "right": ...}}` as the canonical form while
  the current `{"==": [...]}` shape stays as a documented **legacy alias** the
  evaluator normalizes (compat, plan §27).

## Slice D — Conformance suite scaffold (with/after B/C)

**Goal:** shared fixtures that all runtimes must pass; also usable by `vitest`.

- `conformance/README.md` (case format: `{input, context, expected}`).
- `conformance/cases/{text,binding,expression,condition,repeat}/` first batch.
- `conformance/fixtures/` shared data objects.
- A runner that loads the same JSON cases from Vitest (`.ts`) so the React runtime’s
  conformance is asserted **today**, proving the harness; same JSON consumed later by
  Dart/Kotlin runners.

## Slice E — React runtime to conformance (next run)

- Make `expr/evaluate.ts` accept canonical `op`-shaped expressions + the missing ops
  (`gt gte lt lte add subtract multiply divide contains startsWith`) while keeping
  legacy shapes working.
- Add expression-bounded checks (depth, node count) — security §23.
- Version enforcement (`UNSUPPORTED_VERSION`) in `DocumentSchema` path or a
  pre-render validation step.
- Wire the conformance cases into a `@QuarkusTest`-style equivalent: a Vitest suite
  whose name is per-case, so a failing case names the failing semantic.
- Introduce the unified `$bind` resolution doc and align `event.*` semantics.

## Slices F–I — Flutter and Compose runtimes (separate runs)

Each runtime: `parse → validate → resolve bindings → evaluate expressions →
render components → execute actions → handle data → handle errors`, driven by the
same conformance suite. Native idioms only (rule 2).

## Slice J — Server-side UIDL

Metadata/business-config → UIDL generator → validator → `UIDL JSON`. Investigate
whether `compiler/types.ts` (already company-agnostic) becomes the shared contract
or a port to JSON Schemas. No Java UI renderer.

## Slice K — AI pipeline

Wire `generateUidlFromPrompt` → schema validate → semantic validate → render.
Never trust generated UIDL unvalidated (plan §22).

## Slice L — Ongoing

Performance (incremental eval, memo, query dedup), observability (per-node
diagnostics), documentation site, ecosystem.

## Cross-cutting rules for every slice

1. **Smallest coherent change**; add/update tests; run tests; validate examples;
   check public-API compatibility; update docs (plan §32).
2. **Nothing from 2/3 in 1, nothing platform-specific in spec** (workspace + §33).
3. **No giant rewrite** — a cleaner architecture imagined is not a license to break
   the build.
4. Backward-compat obligations from `current-state.md §12`: the published package,
   in-memory + HTTP modes, Meridian invariant + audit gates, the 11 verticals, the
   `uidl-validate` CLI.
5. Promote decisions to `context/memory/projects/uidl-runtime/decisions.md` and
   `docs/adr/` for genuinely architectural choices.

## Open decisions (resolve before Slice E)

- Canonical expression serialization (`op`-form) vs. keeping legacy keys everywhere.
- Whether `spec/` files are generated-from-Zod (commit the output) or hand-maintained
  JSON validated against exemplars. **Default: generated + committed.**
- Whether unknown node types fail hard (prod) or warn (dev) — currently warn+null in
  dev (plan §6/§23 want predictable failure).