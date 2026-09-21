# ADR-0004: Approve the document lifecycle (lifecycle.md)

* **Status:** Accepted (2026-09-15)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

`spec/semantics/lifecycle.md` was the last `Planned` semantics file: it described the
document's observable lifetime (instantiate → render → active → transition → teardown)
but listed four open questions — first-class mount/unmount hooks, re-entry refresh,
teardown of long-running work, and transition guarantees.

The reference runtime already exhibits every phase:

1. `createRenderContext` instantiates: version guard, theme, `data` mirroring
   `dataSources`, `ActionInterpreter` on a fresh event bus. No actions run.
2. `renderUIDocument`/`UIDocumentRenderer` materialize the tree; `$query` fetches begin
   through the host `DataAdapter` (unresolved → `[]`, never `undefined`).
3. The event bus + interpreter drive the active phase.
4. `navigate` emits `route-change` → host `onRouteChange`; async host actions run to
   completion at their seam, never interrupted with partial state.
5. Unmount removes subscriptions, stops the fetch loop, aborts in-flight `$query`
   fetches (`AbortController`); `session`/`route` are never written by the document.

The four open questions have now been answered **as carve-outs**: no first-class
mount/unmount hooks in 1.x (declared `$query` is the "run on mount" mechanism);
re-entry refresh is host-owned (a fresh instantiate runs declared queries); host
long-running teardown is out of the document's control; and the transition rule is
"the firing action completes, async host actions may outlive the transition".

## Decision

**Approve `spec/semantics/lifecycle.md` for spec 1.x** with the five phases and the
carve-outs above. Spec 1.x guarantees the ordering (instantiate → render → no action
at render → active → transition after the firing action → teardown) and the invariants
(unresolved `$query` → `[]`; `session`/`route`/host context never written by the
document). Lifecycle gets **no conformance class** in 1.x: it is an observable
ordering, not a null-context value — the version guard, `dataSources` schema, and
`navigate` shape carry the checkable parts.

## Alternatives rejected

1. **Keep lifecycle Planned.**
   — The doc's own guidance said "build against the runtime's current behaviour":
   promote the file, promote the guidance.
2. **Add `onMount`/`onUnmount` to the document model now.**
   — No consumer-driven requirement exists yet, and phase-2 `$query` already covers the
   motivating case ("run a query on mount"). Adding a hook declaration now would
   invent vocabulary without a buyer (the anti-pattern actions.md rule 1 exists to
   prevent).
3. **Write a lifecycle conformance class.**
   — A null-context case cannot assert "instantiate happened before render". Forcing one
   would mean testing the harness, not the contract.

## Consequences

* Every semantics file whose behaviour the runtime fully exercises is now Approved
  for 1.x (actions, bindings, errors, expressions, mutations, navigation, lifecycle,
  plus versioning). Remaining Draft: `events`, `queries`, `state`, `style`; the only
  planned documents are `component model` and `guided rendering strategy`.
* Lifecycle gains an ADR reference; adopters get a stable behavioral contract.
* Mount hooks, re-entry refresh, and host-teardown guarantees are explicitly deferred;
  a future major revisits each via its own ADR.