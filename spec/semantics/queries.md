# Queries — reading data into scope

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0008-queries-approved.md`.
Model: `packages/core/src/state/dataSources.ts` (`$query`, `runDataSources`,
`serializeResolvedQueries`) and the adapter contract `packages/core/src/data/types.ts`
(`Query`, `QueryResult`). Strict shape: `schema/query.schema.json`.*

A document declares its reads declaratively in the top-level `dataSources` map;
the runtime fetches, holds the results, and exposes them to render via the `data`
display surface and the `state.$data` envelope (`state.md`).

## Declaring a query

Each `dataSources` entry is either an **inline array** (synchronous, verbatim display
rows) or a **`$query` descriptor**, resolved asynchronously against the host's
`DataAdapter`:

```json
{
  "dataSources": {
    "invoices": {
      "$query": {
        "collection": "SalesInvoice",
        "filters": [
          { "field": "status", "op": "eq", "value": { "$bind": "state.statusFilter" } }
        ],
        "sort": [{ "field": "dueDate", "dir": "asc" }],
        "page": { "number": 1, "size": 20 },
        "search": "sinar",
        "fields": ["id", "customer", "total", "dueDate"]
      }
    }
  }
}
```

| Field | Meaning |
|---|---|
| `collection` | The data-layer collection/entity name to query (host-resolved — transport is out of scope). |
| `filters` | `[{field, op, value}]`. `op` is one of the runtime's fixed operators: `eq`, `ne`, `in`, `gt`, `gte`, `lt`, `lte`, `like`, `between` (`in`/`between` take an array value). |
| `sort` | `[{field, dir: "asc"\|"desc"}]`, in priority order. |
| `page` | `{number, size}` — `number` is 1-based. |
| `search` | Free-text across the fields the collection marks searchable. |
| `fields` | Column projection; omitted = every field. |

**`$bind` inside a `$query`.** Leaves of the descriptor may be `{"$bind":
"state.<path>"}` or `{"$bind": "session.<path>"}`, resolved **deep** (anywhere in the
descriptor) against the **current** scope when the query runs — a `query` action or a
refresh re-resolves them, so a filter bound to `state` follows the latest value.
Deliberately narrower than render bindings: `local`/`route`/`data` make no sense at
document level (`bindings.md`).

## Results and the envelope

A run writes, per source, `state.$data.<name>.{status, rows, total, error}`
(`state.md`), where `status` is `idle` → `loading` → `success`/`error` and `rows`/
`total` come from the adapter's `QueryResult`. The `data.<name>` display surface is the
**current `rows`** (`[]` before the first resolution), so a frame never renders a
partial or `undefined` list.

## Behaviour

1. **Data is read-only in render.** Scope values are stable while expressions evaluate;
   `$data` is owned by the runtime and a document never writes it.
2. **Running is the runtime's job; triggering is declarative.** The reference renderer
   re-runs a `$query` when its **resolved** query changes (it diffs
   `serializeResolvedQueries` per name), and a document can request a run explicitly
   with the `query` action on a named source (`actions.md`).
3. **A missing/loading dataset displays as empty, errors are data.** Bindings see the
   display rows (`[]` until resolved) and the envelope (`status`, `error.code`), so a
   template branches with `visibility.condition` on `state.$data.<name>.status` rather
   than on a thrown exception.
4. **Pagination metadata is data.** `state.$data.<name>.total` is the adapter's total;
   controls bind `page.number`/`page.size` through `state` and a change re-runs the
   digits (`onPageChange`/`onPageSizeChange`, `events.md`).

## Error behaviour

A failed fetch writes `status: "error"` and `error: {code, message}` (normalized
`DataError` shape, so in-memory and HTTP adapters behave identically) and publishes
**no partial rows** — the display surface keeps its previous rows, and a frame never
shows a wrong total. A superseded run (an `AbortError` from a newer trigger) is not a
failure: it settles silently and the newer run's result stands.

## Conformance boundary

`schema/query.schema.json` mirrors the `$query` descriptor (including the fixed `op`
enum) — a strict consumer rejects a descriptor that fails it. The adapter contract
itself (`data/types.ts`) is **host-side**, not document contract, and is not part of
document validation.

## Not in scope for spec 1.x (planned)

- Transport, retry and caching policy, request cancellation beyond the
  supersede-on-newer-run behaviour.
- How a collection marks its searchable fields.
- Offline/replay and incremental sync (the `mutation`/`query` overlay story is a
  future major; shipments today are per-run and whole-result).