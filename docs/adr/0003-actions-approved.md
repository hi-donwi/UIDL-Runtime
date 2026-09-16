# ADR-0003: Approve the action vocabulary (actions.md) — add `download`

* **Status:** Accepted (2026-09-15)
* **Deciders:** Project maintainers
* **Project:** uidl-runtime

## Context

`spec/semantics/actions.md` defines the declarative behaviour model: a fixed action
vocabulary keyed by the top-level key of each action object, resolved via
`$bind`/`$expr` markers, dispatched by `ActionInterpreter`. It stayed Draft because it
named `query`, `download`, and extension actions as "planned additions" for a future
major.

Two things changed that situation:

1. **`download` is now implemented.** A `download` action delegates to a host-owned
   `downloadHandler` (exactly the `command`/`mutate` seam pattern) and is fail-closed:
   no handler → reported error + snackbar, never a silent no-op. It is typed in
   `types/actions.ts`, validated by `ActionSchema` (`schemas/actions.ts`) and
   `spec/schema/action.schema.json`, dispatched by `ActionInterpreter`, plumbed through
   `RenderOptions`/`renderUIDocument`/`UIDocumentRenderer`, covered by two unit tests,
   and exercised by an active conformance case (`action/download-resolvable`).
2. **The `query` and extension carve-outs stand on their own.** `query` (re-running a
   declared data source on demand) and host-registered extension kinds both need a real
   semantic decision before implementation; neither has one yet.

All other rules in actions.md (actions never run at parse time; `event` scope exists
only at action time; `setState` targets `state` only; fail-closed defaults; failures
are reported via the error pipeline and `ActionReport`) are implemented and
conformance-tested.

## Decision

**Approve `spec/semantics/actions.md` for spec 1.x** with the fixed vocabulary of
eleven kinds: `sequence`, `if`, `setState`, `navigate`, `api`, `mutate`, `command`,
`download`, `showSnackbar`, `showDialog`, `validate`.

**Carve out of spec 1.x:** `query` and extension actions. They are planned for a future
major (a separate ADR precedes each implementation), and strict consumers keep
rejecting them as `UNKNOWN_ACTION` until then. This mirrors the "route params only"
scoping already applied to `navigation`.

## Alternatives rejected

1. **Keep actions.md Draft until `query` and extensions ship.**
   — That holds the whole action contract hostage to two still-undecided features. The
   fixed eleven-kind vocabulary is stable and fully covered today; carving them out is
   the honest status.
2. **Implement `query` now as another host handler.**
   — Without a decision on whether `query` re-runs declared data sources, forces a full
   refetch, or refreshes only one named source, a host seam would hard-code the wrong
   semantic (the same trap `query`/'download' fetchers warn about). Deferred.
3. **Leave `download` out of the approved vocabulary and Approve actions.md as-is.**
   — The runtime would then implement a word the spec 1.x contract does not name. The
   vocabulary must mirror the runtime exactly (the action.schema.json lesson).

## Consequences

* Eleven kinds are frozen for 1.x; adding a twelfth is a spec-1.x change requiring an
  ADR, and observably a feature addition.
* `download` becomes the reference implementation other runtimes copy: a host seam, a
  stable `download-response` event, status/error/result paths, and fail-closed default.
* `query`/extension remain `UNKNOWN_ACTION` in strict consumers; documents using them
  are not valid spec 1.x documents.