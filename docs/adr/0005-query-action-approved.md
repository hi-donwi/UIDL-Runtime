# ADR-0005: Add and approve the `query` action

* **Status:** Accepted (2026-09-15)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

ADR-0003 approved `actions.md` with a fixed eleven-kind vocabulary and carved `query`
out of spec 1.x pending a real semantic decision. That decision now exists.

`query` answers one need the other kinds leave open: **trigger a declared data source
outside the document's mount/refresh loop** — a "refresh" / "load on demand" action. The
scope question raised in ADR-0003 had three candidate answers:

1. re-run **all** declared data sources (a blanket refresh);
2. force a full refetch of any datasource by name;
3. re-run **one named `$query` source** through the same runner the mount/refresh loop
   already uses.

Option 1 changes everything on one click — surprising and expensive. Option 2 blurs the
`$fetch`/`$query` distinction and forces a network semantic that the data layer does not
own; `$query` sources are already resolved to a concrete query by the shared runner
(`runDataSources`). Option 3 builds on an existing, conformance-tested mechanism and
keeps the action a small, predictable, composable unit.

The implementation follows the ADR-0003 seam pattern exactly: the interpreter already
had `dataSources` and `dataAdapter` available for the mount/refresh loop, so `query`
needs no new host seam — it re-enters `runDataSources` for the named target and writes
the result where the loop writes it (`state.$data.<target>.{status,rows,total,error}`),
then emits `query-response` and runs `onSuccess`/`onError`. That makes `query` the
first action whose fail-closed condition is a **missing capability in
`ActionInterpreter`'s own context** (no `dataAdapter`) rather than a missing host
handler — still reported through the same error + snackbar pipeline, never a silent
no-op.

## Decision

**Add `{"query": {"target": "<declared $query data source name>", "onSuccess"?,
"onError"?}}` to spec 1.x and approve it as part of `actions.md`** (ADR-0005 in addition
to ADR-0003). Semantics:

- `target` names a **declared `$query` data source** — not `$fetch`, not an inline
  array. A non-`$query` or unknown target is rejected (`query-response` with
  `success: false` + snackbar).
- Running the action re-runs that one source through `runDataSources`, including
  re-resolving its `$bind` params against the **current** `state` (a refresh picks up
  new filters).
- Success/failure land in `state.$data.<target>` exactly like the mount loop's, and
  `query-response` fires with `{ target, success, error?, code? }`.
- Fail-closed: no `dataAdapter` → reported refusal. This is "run a query" — no separate
  lifecycle hook (lifecycle.md remains host-driven).

The vocabulary is now **twelve kinds**. The **extension** carve-out (host-registered
custom kinds, ADR-0003) is unchanged and stays `UNKNOWN_ACTION`.

## Alternatives rejected

1. **Blanket refresh (re-run every declared source).** One click re-issues every query —
   surprising, hard to reason about, and hostile to the "one concern per action"
   principle. Rejected.
2. **Force a full refetch by dataSource name.** Requires the adapter to support an
   explicit "refetch ignoring cache" op, which the `DataAdapter` contract deliberately
   does not define; it also conflates `$fetch` and `$query`. Rejected for spec 1.x.
3. **Another host handler (like `command`/`download`).** Would move data-layer behaviour
   out of the document and into host code, split the data sources' single runner into
   two code paths, and leave documents unable to express "refresh this list" without
   host cooperation. The whole point of declared `$query` sources is that the document
   already owns the query. Rejected.
4. **Keep `query` carved out.** Nothing else in spec 1.x can refresh a declared source;
   the gap the carve-out acknowledged now has a decided, implemented shape. Rejected.

## Consequences

* Twelve kinds are frozen for 1.x; a thirteenth kind is a spec-1.x ADR change.
* `query` gives documents an on-demand refresh with the same data contract and fail-closed
  discipline as the mount loop — the DataTable "refresh" button is expressed in UIDL, not
  host code.
* Extension actions remain the only unsupported kind in spec 1.x.
* New conformance case `action/query-target`; unit coverage in
  `interpreter.query.test.ts` (success, re-resolved `$bind`, fail-closed without
  adapter, unknown/non-`$query` target, `onSuccess` chaining).
* `runDataSources` gains an optional `names` parameter (additive) to run a restricted
  target set; the public index exports gain only type exports.