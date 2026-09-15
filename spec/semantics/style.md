# Style — the permissive style layer

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0009-style-approved.md`.*
*Model: `packages/core/src/types/theme.ts` (`StyleIntent`), the theme engine
`packages/core/src/theme/engine.ts`, and `schema/node.schema.json`'s permissive
`style` object.*

UIDL is a neutral layout-and-behaviour contract. It makes **no** CSS-assumptions,
and nothing in this specification uses CSS syntax. The style layer that *does* exist is
described here so implementers know how style sits beside the behavioural contract.

## What a UIDL document says about style

1. **Nodes carry a `style` object.** Its meaning is defined by the renderer: the
   reference renderer interprets the `StyleIntent` vocabulary (`types/theme.ts`) via the
   theme engine, React Native uses a smaller native vocabulary; the schema itself
   (`node.schema.json`) is intentionally unopinionated (`additionalProperties: true`).
2. **Style is declarative data, not code.** A document says `"fontWeight": "bold"` or a
   `{primitives.color.primary}` token reference; it does not produce a CSS string or
   TSX. `StyleIntent` values may be **responsive** (`{base: "...", md: "..."}`) and
   token references of the form `{primitives.<category>.<key>}` are resolved by the
   theme engine to platform variables (e.g. CSS custom properties).
3. **Style is passed to the renderer like any prop.** `style` is not a special key in
   the evaluator; the renderer merges it (with any theme variant) and interprets it at
   the boundary.

## Conformance boundary

- `packages/core/src/types/theme.ts` (`StyleIntent`) is the reference vocabulary; the
   theme engine (`packages/core/src/theme/engine.ts`) is authoritative for how the
   reference renderer interprets it. A different renderer may define a different
   vocabulary and be conformant as long as it produces the same visible outcome for the
   same document.
- A renderer that renders `style.visibility: 'hidden'` as a visible node is
  non-conformant. How the platform hides the node (CSS, native properties, no render)
  is the renderer's business.
- `style` is never part of the behavioural contract: it cannot reference `state`,
  `event`, actions, or data — presentation overrides are static/declarative (a
  `bindings` map on the node handles dynamic values, `bindings.md`).

## Not in scope for spec 1.x (planned)

- Resolving `StyleIntent` tokens to raw CSS/TSX properties — that mapping is a
  renderer concern outside the neutral contract (the reference renderer already maps
  them; native targets do their own).
- `variants` semantics beyond theme component variants (a dedicated per-node style
  variant model is a future addition).
- A shared token dictionary for component surfaces (planned, subject to token registry
  rules); pure-primitives token refs already resolve today.