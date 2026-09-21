# ADR-0009: Approve the style semantics (style.md)

* **Status:** Accepted (2026-09-15)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

`spec/semantics/style.md` was the last Draft file. It described the deliberately
permissive style layer: UIDL is neutral — it makes no CSS assumptions, nodes carry a
`style` object whose meaning is renderer-owned, and the schema
(`node.schema.json`'s permissive `style` object) is intentionally unopinionated.

Three stale claims stood between it and approval:

1. It pointed at `packages/templates/src/style/intent.ts` as the reference `StyleIntent`
   vocabulary — **that file does not exist.** `StyleIntent` lives in
   `packages/core/src/types/theme.ts`, and the theme engine
   (`packages/core/src/theme/engine.ts`) is what actually interprets it.
2. It called "responsive style" a **planned** addition — but `StyleIntent` values are
   already `T | ResponsiveValue<T>` and the engine passes responsive values through
   (e.g. to breakpoint classes). Only *variant semantics* and a shared token dictionary
   remain future.
3. It did not mention that **pure-primitives token references already resolve** today:
   `{primitives.<category>.<key>}` → platform variables (`var(--…)` in the reference
   renderer) via the theme engine.

Everything else in the file was already accurate and matches the runtime: style is
declarative data (never CSS/TSX), it is not special to the evaluator, and the
`visibility: hidden` conformance boundary holds.

## Decision

**Approve `spec/semantics/style.md` for spec 1.x**, updated to mirror the runtime:

- The reference vocabulary is `StyleIntent` (`packages/core/src/types/theme.ts`)
  interpreted by the theme engine (`packages/core/src/theme/engine.ts`); the schema
  stays unopinionated.
- Responsive `StyleIntent` values and `{primitives.<category>.<key>}` token references
  are part of 1.x; renderers map them to platform primitives at the boundary.
- Style is presentation-only: it cannot reach `state`/`event`/actions/data; dynamic
  values use the `bindings` map.

**Carve out of spec 1.x:** a dedicated per-node style-variant model, the shared
component-surface token dictionary, and renderer-internal raw CSS/TSX mapping.

## Alternatives rejected

1. **Keep style.md Draft because style is deliberately underspecified.** It *is*
   specified — the permissive boundary is a decision, and renderers copy the
   reference vocabulary. The only blockers were stale paths and stale carve-outs, which
   the update fixes. Keeping it Draft overstates uncertainty that isn't there.
2. **Tighten `node.schema.json`'s `style` to the `StyleIntent` keys.** The permissive
   object is a deliberate compatibility surface (node-level style merged with theme
   variants and responsive/TokenRef values); making it strict would reject documents
   the runtime accepts and contradict the "style meaning is renderer-owned" contract.
   Rejected.
3. **Document raw CSS/TSX emission as conformant.** The neutrality principle is the
   point of UIDL; producing platform CSS from document markup stays a renderer
   internal, not a document capability. Rejected.

## Consequences

* **Every semantic Draft file is now Approved.** spec 1.x is fully specified and the
  runtime implements all of it; `style.md` closes the set (`expression`, `binding`,
  `navigation`, `versioning`, `mutations`, `errors`, `events`, `state`, `queries`,
  `actions`, `lifecycle`, plus this one).
* The reference vocabulary path in style.md is correct (core, not templates).
* No runtime or schema change — this increment is specification only.