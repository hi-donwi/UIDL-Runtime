# State — where variables live and how render scope is assembled

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0007-state-semantics-approved.md`.*
*Model: `packages/core/src/state/createDocumentState.ts` (state store),
`packages/core/src/state/bindings.ts` (scope type + resolution),
`packages/core/src/state/dataSources.ts` (the `$query` envelope).*

A renderer evaluates every binding and expression against a single **render scope**.
The scope is a flat map of named sub-scopes; a binding names one of them plus a
dotted path, e.g. `state.cart.total`.

## The five render scopes

| Scope | Lifetime | Contents |
|---|---|---|
| `local` | One node subtree. Re-created per node render. | Loop variables (`item`, `index`), computed per-node values |
| `state` | The document-internal model. Mutable via actions. | The data the screen is about |
| `session` | The user's session, same for every screen. Not writable by a document. | Authentication context, preferences, active user |
| `route` | The current navigation target. Read-only. | Request/route params for this screen |
| `data` | The results of this document's declared queries. Read-only. | Display rows per declared data source |

`event` is **not** a render scope. An `event.<path>` reference exists only at action
time, bound by the event that triggered the action (`events.md`); inside a render
expression it resolves to nothing (`bindings.md`).

## The data surface: display rows and the `$query` envelope

The runtime surfaces query results in **two places under two namespaces** — this is
spec 1.x's data contract.

| Surface | Path | Shape | Who reads it |
|---|---|---|---|
| Display | `data.<key>` | one array of rows per declared data source | simple binds (`data.rows`), `repeat.dataSource`, `props.dataSource`-driven widgets |
| Envelope | `state.$data.<key>` | `{status, rows, total, error}` | status-aware recipes (list/form), the `query` action, refresh loops |

- **`data.<key>` is the display surface.** For an inline-array data source it is the
  array verbatim; for a declared `$query` source it is the **current `rows`**, and `[]`
  before the first resolution (a frame never renders a partial/`undefined` list). It is
  populated from the same result the envelope records.
- **`state.$data.<key>` is the lifetime envelope.** The shared runner
  (`runDataSources`) and the `query` action write `status` (`loading`/`success`/
  `error`), `rows`, `total`, and `error` here, so bindings and conditions can react to
  the *lifecycle* of a query, not just its rows (`dataSources.ts`).
- `$data` is a **reserved namespace under `state`**, owned by the runtime. A document
  never writes it: `setState` targets ordinary `state` paths only (`mutations.md`); the
  reserved namespace is off-contract for document writes in 1.x.
- The two namespaces never shadow: `data.rows` and `state.$data.rows` are different
  variables (`$data.rows` is the envelope for target `rows`, `data.rows` its display
  rows).

## Assembling the scope

1. Start with the query results for this document → `data` (+ envelope freshness in
   `state.$data` for recipes).
2. Attach the **host-supplied** `route` params (read-only) — the standard render paths
   resolve a `route.*` binding against the route object the host provides through the
   render scope; a host that doesn't supply one leaves `route` empty.
3. Attach the session context → `session` (read-only).
4. Initialize `state` from `initialState` (see `document.schema.json`); the runtime
   pre-populates the `$data` sub-namespace.
5. As the node tree evaluates, slots under `local` and (through actions) `state`
   become available.

Precedence within a single dotted path resolution is by key, not by scope: scopes are
distinct namespaces, so `state.name` and `local.name` are different variables and
never shadow each other. Resolution of a full binding path is deterministic: unknown
prefix, missing scope, or missing key all resolve to **`undefined`**, never a throw.

## What a document may read

- `local`, `state`, `data`: freely — these are the document's own variables.
- `route`: read-only; a document never rewrites its own URL params (it navigates to a
  new route instead).
- `session`: read-only; a document never writes auth/session context directly.

## Scope nesting by node

`local` is the only scope that changes meaning while walking the tree. A loop node
introduces one `local` layer for its subtree; nested loops introduce nested layers,
inner shadowing outer for the same variable name.

## Serialization

Whatever the underlying platform, the scope must serialize to plain JSON values:
`null`, boolean, number, string (surrogate pair sequences), arrays of these, and
mappings of string keys to any of the above. `undefined` is a **missing-key marker**
during resolution, never a value that survives a round-trip.