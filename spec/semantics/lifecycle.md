# Lifecycle — when screens execute side effects

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0004-lifecycle-approved.md`.
Reference: `createRenderContext`/`renderUIDocument`/`UIDocumentRenderer`
(`packages/core/src/renderer/`), `ActionInterpreter`
(`packages/core/src/actions/interpreter.ts`), the `$query` fetch loop
(`packages/core/src/state/dataSources.ts`), `navigate` (actions.md).*

A screen's observable lifetime, from the document's point of view. The five phases
below are implemented by the reference runtime; other conformant implementations must
expose the same observable ordering — **instantiate before render, render before any
action, teardown after the last action-complete** — even when their internals differ.

## Phases

1. **Instantiate.** The runtime resolves the route params and `session`, seeds `data`
   (declared queries) and initializes `state` from the document's `state` field
   (`document.schema.json`). In the reference runtime this is `createRenderContext`:
   it asserts the version, resolves the theme, mirrors every `dataSources` entry into
   `data` (inline arrays as-is; `$query` sources as their resolved rows or `[]`), and
   builds the `ActionInterpreter` wired to the event bus. **No action runs here.**
2. **Render.** The node tree materializes: bindings resolve, expressions evaluate,
   events attach. `$query` data sources begin fetching through the host `DataAdapter`;
   a bind whose source has not resolved yet sees `[]`, never `undefined`
   (nothing to retry later — props stay live via the host's re-render loop).
   **No action runs at this stage** (actions.md rule 1: a render pass never mutates
   `state`, never navigates, never fetches beyond declared `$query` sources).
3. **Active.** Events fire actions; actions mutate `state` (mutations.md) and may
   navigate or reach host seams (`api`/`mutate`/`command`/`download`); affected
   subtrees re-render. This phase lasts as long as the screen is on the stack.
4. **Transition.** A `navigate` fires → the interpreter emits `route-change` on the
   event bus and the host's `onRouteChange` (if any) decides the actual destination.
   The document declares intent only; moving screens is host-owned. The outgoing
   screen's event wiring is torn down at teardown, **after** the firing action
   completes. An async host-facing action (`api`/`mutate`/`command`/`download`) is
   never interrupted with partial state: it continues at its host seam, and its
   later `state` writes land only if the document's store is still reachable.
5. **Teardown.** The screen's wiring is released. In the reference runtime, unmount
   removes event-bus subscriptions, stops the `$query` fetch loop and aborts any
   in-flight fetch (`AbortController`), and drops the rendered tree. `session`,
   `route`, and host context are never modified by the document.

## What spec 1.x does NOT specify (carve-outs)

The following are explicit carve-outs — deliberately outside the 1.x contract, each
revisitable in a future major via an ADR:

- **First-class mount/unmount hooks.** There is no `onMount`/`onUnmount` action
  declaration in spec 1.x. "Run a query on mount" is expressed by declaring a
  `$query` data source (phase 2 fetches it) or by a `navigate`-time action; arbitrary
  side effects on mount are a host concern. Unknown document keys stay unknown.
- **Re-entry refresh policy.** Returning to a back-stacked screen, and whether a fresh
  instantiate re-runs queries, is host-owned in 1.x. Spec 1.x only requires that a
  **new instantiate** runs declared queries (phase 2).
- **Teardown guarantees for host long-running work.** Aborting downloads or cancelling
  host-backed requests beyond the renderer's own `$query` fetch is the host's job; the
  document cannot promise cancellation semantics a host does not provide.

## Conformance

Lifecycle is an observable ordering (instantiate → render → active → transition →
teardown), not a value a null-context case can assert, so it has **no conformance
class** in 1.x. Conformance instead pins the checkable pieces it depends on: the
version guard (`createRenderContext`), schema validation of `dataSources`, and the
`navigate` action shape (actions.schema).