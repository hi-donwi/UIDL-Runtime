# Navigation — how `route` gets its value

*Status: **Approved** for spec 1.x (the bits this file pins); the runtime implements
the whole of it.*

Navigation moves the app from one screen document to another. The document only
**declares** the intent — `navigate` action (see `actions.md`) or a row-level route
binding — and the runtime performs the transition. After the transition, the target
document's `route` scope is populated with the target route's params.

## Route identification

A route is identified by a string (`to`). Route names and the routing table are a
runtime/host concern, not a document concern. A document names a route; whether its
name resolves is validated at the moment of navigation, not at parse time.

## Route params

1. **Params are values, not expressions.** The `params` map of a `navigate` action
   is evaluated to plain JSON values *at action time* — expressions/bindings in the
   map resolve against the **current** scope before the transition begins.
2. **After transition, params become `route.<key>`.** The target document reads its
   inputs via bindings like `route.orderId`.
3. **Missing params are `undefined`.** A target that binds `route.id` without the
   navigator supplying it resolves `undefined` and (per the template language) falls
   back or hides — no crash.
4. **`route` is read-only in render** (state.md) — a document never rewrites its own
   incoming params.

## Replace vs push

A `push` transition stacks the target; `replace` swaps the current entry. Both are
declared on the action. The route's **identity** (name + params) is what a renderer
uses to decide whether a document is relevant and whether to re-run its queries; a
compare that ignores param changes is a correctness bug in the runtime, not a spec
violation here.

## SSR / deep links / back

How a runtime maps a document to an initial URL, and how "back" restores `route`,
are runtime contracts outside the document language. The document is agnostic: it
binds `route.*`, never a concrete URL.