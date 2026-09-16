# ADR-0008: Approve the queries semantics (queries.md)

* **Status:** Accepted (2026-09-15)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

`spec/semantics/queries.md` stayed Draft describing an **aspirational** query shape —
a `key`/`source`/`params`/`paging` table pointing at a backend "endpoint/contract
name" resolved by a future data layer. The reference runtime speaks a different,
already-shipped contract:

- top-level `dataSources` entries are inline arrays or `{"$query": {collection,
  filters, sort, page, search, fields}}` (`QueryDataSource`);
- `$bind` leaves resolve **deep** against `state`/`session` at run time
  (`resolveQueryDescriptor`);
- results land in the `state.$data.<name>` envelope (`{status,rows,total,error}`)
  written by the shared runner `runDataSources` (the mount/refresh diff loop and the
  `query` action ADR-0005 both feed it), and `data.<name>` exposes the current rows;
- errors normalize to `DataError` shape (`{code,message}`), never partial rows;
- the strict shape already exists at `schema/query.schema.json`, except its
  `filters.op` was the loose `string` while the runtime's `QueryOp` is a fixed
  nine-operator union.

The Draft also referenced `packages/core/src/types/query.ts`, which does not exist
(the adapter contract lives in `packages/core/src/data/types.ts`, a host-side
interface).

## Decision

**Approve `spec/semantics/queries.md` for spec 1.x**, rewritten to mirror the runtime:

- The `$query` descriptor (`collection`, `filters`, `sort`, `page` 1-based, `search`,
  `fields`) is the spec 1.x query shape; `schema/query.schema.json` is its strict
  mirror, **tightened so `filters.op` is the runtime's `QueryOp` enum**.
- `$bind` inside `$query` is the state/session-only, deep-resolved mechanism; a run
  re-resolves it, so filters follow current state.
- Results and lifecycle are the `state.$data.<name>` envelope; the `data.<name>`
  display surface is current `rows` (`[]` pre-resolution).
- Triggering is declarative: the renderer's resolved-query diff re-runs on change, and
  the `query` action re-runs a named source.
- Errors are data (`status`/`error.{code,message}`, normalized `DataError`), never
  thrown into render and never published as partial rows; a superseded `AbortError` is
  silence.

**Carve out of spec 1.x** (each its own future ADR): transport/retry/caching policy,
explicit arrangement beyond supersede-on-newer-run, searchable-field definition, and
offline/replay/incremental sync. The `DataAdapter` contract is host-side and stays out
of document validation.

## Alternatives rejected

1. **Approve the Draft as-written (endpoint/`source` model).** Names a backend contract
   (`source: "voucher.list"`) that exists nowhere in the runtime and would make the
   spec a second, incompatible query language. Rejected.
2. **Keep `filters.op` loose in query.schema.json.** The action.schema.json lesson:
   the schema must mirror the runtime's closed vocabulary exactly, not over-admit. The
   enum is that vocabulary. Rejected.
3. **Promote the adapter contract into the document spec.** `Query`/`QueryResult` are
   the host's data-layer interface; making them document contract would couple UIDL
   documents to a specific adapter API. The document side stays the `$query`
   descriptor. Rejected.
4. **Keep queries.md Draft.** Its behaviour (runner, envelope, error shape, `query`
   action) is fully exercised and conformance-covered; the Draft's only real content
   was an aspirational shape that argued against approval. Approving the mirror closes
   the last data-semantics gap. Rejected.

## Consequences

* The data semantics are now fully Approved end-to-end: `queries.md` (read) +
  `mutations.md` (write) + `state.md` (where it all lives).
* `schema/query.schema.json` gains the `op` enum; strict consumers now reject
  descriptors the runtime would never accept.
* Draft files are reduced to `style.md`; everything else semantic is Approved.
* The compiler's list/form recipes already emit `$query` descriptor + `state.$data`
  binds, so no runtime change was needed for this approval.