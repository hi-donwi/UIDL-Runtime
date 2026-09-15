# ADR-0006: Approve the events semantics (events.md)

* **Status:** Accepted (2026-09-15)
* **Deciders:** PT Mumpuni Kolaborasi Teknologia
* **Project:** uidl-runtime

## Context

`spec/semantics/events.md` stayed Draft because it described an **aspirational**
framework-independent vocabulary — lowercase web-platform names (`change`, `click`,
`press`, `focus`, `blur`, `rowAction`) — while the reference runtime wires a different,
**registry-declared** set of names per node kind: `onClick`, `onChange`, `onBlur`,
`onFocus`, `onSubmit`, `onRowAction`, `onOpen`, `onPageChange`, `onPageSizeChange`,
`onCardClick`, `onNodeClick`, `onClose` (see `registry/defaults.ts` and
`RenderNode.tsx` `resolveEvents`).

Three concrete claim-vs-runtime divergences kept the file from being honest to the
contract:

1. Its example used `{"type": "set", ...}` — a legacy action shape replaced in
   ADR-0001/0003 by top-level `setState`/`navigate`/etc.
2. Its capture table promised `click`/`press` → `event.node` and `rowAction` →
   `event.index`/`event.row`; the runtime captures only what a wired handler actually
   receives — a plain value for control/page events, the row object for DataTable row
   events, and a host-defined payload for the rest.
3. It promised `UNSUPPORTED_EVENT` validation on unsupported wiring; nothing in the
   runtime raises it. The code sits in the taxonomy (errors.md) with no producer.

Every prior approval followed the "the spec mirrors the runtime, exactly" rule (the
`action.schema.json` lesson from ADR-0003): a Draft spec file may describe an ideal
future, but an **Approved** one must describe what the reference runtime actually does,
with anything else carved out.

## Decision

**Approve `spec/semantics/events.md` for spec 1.x** rewritten to mirror the runtime:

- Event names are the **registry-declared, per-node-kind** vocabulary — the camelCase
  names above — and a node kind's supported set is the contract, not a global list.
- The capture contract is what the platform renderer hands a wired handler, resolved
  through `$bind: "event"` / `event.<path>`; `setState`'s `value: null` convention
  ("use what the event carried") is reaffirmed.
- The action-sequence semantics (rules 1–2, 4–5) hold as drafted: events fire actions
  never code; capture is a plain object at the platform boundary; multiple actions run
  in order and stop on the first failure; `event` is not a render value.

**Carve out of spec 1.x** (planned minor content, each needs its own ADR):

- Gestures, keyboard access, drag-and-drop payload shapes.
- A lowercase, framework-independent alias vocabulary.
- Parse-time enforcement of the supported-event set per node kind — `UNSUPPORTED_EVENT`
  remains a **reserved marker** in the taxonomy with no producer in 1.x (the honest
  statement, replacing the false "validation issue" promise).
- Mount/unmount lifecycle events (host-driven per ADR-0004).

## Alternatives rejected

1. **Approve the Draft as-written (aspirational vocabulary + `UNSUPPORTED_EVENT`
   promise).** Blesses a vocabulary the runtime does not speak and a validation the
   runtime does not enforce — the exact mistake ADR-0003's schema-mirroring rule
   forbids.
2. **Implement `UNSUPPORTED_EVENT` enforcement now.** The taxonomy's other producers
   live at schema/render boundaries that are deliberately permissive (a strict
   document.schema would break the "all 25 documents validate" rule); enforcing per-node
   event sets needs a new boundary and would reject documents the compiler does not
   currently constrain. A real feature, useful, but out of this increment's scope —
   deferred, with the marker reserved for it.
3. **Approve nothing and keep events.md Draft.** The behaviour is exercised,
   conformance-covered, and unambiguous; the only blockers were the false claims, which
   the rewrite removes. Keeping it Draft understates the contract's stability.
4. **Invent a neutral lowercase vocabulary.** The "framework-independent" vocabulary the
   file promised is exactly what UIDL's spec schema should avoid re-litigating in 1.x:
   the registry IS framework-independent (names are strings a renderer maps); inventing a
   second vocabulary for the same events means two names for one meaning.

## Consequences

* Approved files now cover behaviour end-to-end: `events.md` + `actions.md` +
  `lifecycle.md` together define how user input reaches behaviour without code.
* The registry's per-node-kind `events` declarations are now **contract** for 1.x; a
  document may only wire the names a node kind declares.
* `UNSUPPORTED_EVENT` is documented as reserved (no producer) rather than silently
  aspirational — the same honesty fix applied to `DISABLED_ACTION` in mutations.md.
* No runtime or conformance change: this is a specification-status increment.