# ADR-0007: Approve the state semantics (state.md) — the data surface contract

* **Status:** Accepted (2026-09-15)
* **Deciders:** PT Mumpuni Kolaborasi Teknologia
* **Project:** uidl-runtime

## Context

`spec/semantics/state.md` stayed Draft because the **data surface** was undefined. The
reference runtime surfaces query results in two distinct places:

1. a `data.<key>` **display surface** — one array of rows per declared data source
   (inline arrays verbatim; `$query` sources' current `rows`, `[]` before the first
   resolution), read by simple binds, `repeat.dataSource`, and
   `props.dataSource`-driven widgets;
2. a `state.$data.<key>` **lifetime envelope** — `{status, rows, total, error}` as
   written by the shared runner (`runDataSources`) and the `query` action, read by
   status-aware list/form recipes that bind `state.$data.<key>.status/rows/total`.

The compiler already emits `state.$data.*` binds for list/form recipes, and the mount/
refresh loop and the `query` action (ADR-0005) both write the envelope — so the
envelope is the runtime's *authoritative* data location, and `data.<key>` is its
display projection. Two knock-on inconsistencies surfaced while reconciling state.md:

- `bindings.md` (Approved) defined `segment := (alphanumeric | "_")+`, which would
  make `state.$data.invoices.status` invalid — yet its own
  `schema/binding.schema.json` pattern is `[^.]+` (any non-dot segment) and the
  runtime resolves `$data` unambiguously. The prose grammar, not the schema, was wrong.
- The `route` scope is host-supplied: the standard render paths resolve `route.*` when
  the host provides the route object through the render scope, and leave it empty
  otherwise — worth stating plainly instead of implying the renderer always injects it.

## Decision

**Approve `spec/semantics/state.md` for spec 1.x** with the data-surface contract:

- The five render scopes (`local`, `state`, `session`, `route`, `data`) and their
  stability are contract, matching `bindings.md`; `event` is not a render scope.
- **`data.<key>` is the display surface** (rows array), **`state.$data.<key>` is the
  lifetime envelope** (`{status,rows,total,error}`). Both exist in 1.x; the envelope is
  the authoritative record, the display surface its rows projection.
- **`$data` is a reserved namespace under `state`**, owned by the runtime. Documents
  read it but never write it: `setState` targets ordinary `state` paths only.
- `route`/`session` are read-only, host-supplied scopes; missing scopes resolve to
  `undefined`; the serialization + `undefined`-as-missing-key rules hold as drafted.

**Amend `bindings.md` (Approved) by ADR-0007:** the segment grammar is `[^.]+` (any
non-dot characters, matching `schema/binding.schema.json`), with `$data` documented as
the reserved `state` namespace. No schema change — the JSON pattern already admits it.

## Alternatives rejected

1. **Make `data.<key>` the only data surface and drop `state.$data` from the public
   contract.** The compiler, the recipes, and the `query` action all speak
   `state.$data`; declaring it host-internal would leave the most-used binding path out
   of the contract. Rejected.
2. **Make `state.$data` the only surface and demote `data.<key>`.** `data.<key>` is
   Approved vocabulary (`bindings.md`) and the readonly array surface for
   `repeat.dataSource`/widget `dataSource` props; removing it breaks repeat and
   widget data binding. Rejected.
3. **Add a sixth top-level `$data` scope.** The five-scope rule is Approved in
   `bindings.md`; a sixth namespace would cascade through validation, scope assembly,
   and every expression. The envelope already nests naturally under `state` (state is
   writable only by actions, which is exactly how the runner writes it). Rejected.
4. **Keep state.md Draft to avoid touching bindings.md.** The grammar contradiction is
   real (the prose said `$data.*` is invalid while the schema and runtime accept it);
   leaving it unstated means two Approved files disagree. The amendment is a one-line
   grammar fix plus a reserved-namespace note. Rejected.

## Consequences

* The scope model is now fully Approved: `state.md` + `bindings.md` + `expressions.md`
  define the render scope together.
* `state.$data.<key>.*` binds are contract-legal and documented as the read-only
  runtime-owned envelope; recipes do not need a carve-out.
* A document that tries to `setState` into `$data` is off-contract (not yet enforced
  at parse time — candidate ticket).
* `route` is documented as host-supplied; a candidate ticket is wiring a `route` option
  through `RenderOptions`/`UIDocumentRenderer` so hosts can populate it without passing
  the scope manually.
* No runtime or conformance change: this increment is specification + grammar only.