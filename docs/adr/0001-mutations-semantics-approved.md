# ADR-0001: Approve mutations semantics for UIDL spec v1

- **Date:** 2026-09-15
- **Status:** Accepted
- **Deciders:** PT Mumpuni Kolaborasi Teknologia
- **Project:** uidl-runtime

## Context

The mutations semantics file (`spec/semantics/mutations.md`) was introduced as Draft
during Stage C while the action contract (`actions.md`) was still in flux. Since then:

- The action vocabulary has been finalised and aligned to the runtime
  (`types/actions.ts`, `schemas/actions.ts`); `UNKNOWN_ACTION` is now raised
  deterministically.
- `ActionInterpreter.run()` provides an observable, deterministic report for action
  failures — mutations are no longer fire-and-forget with console warnings only.
- The inbound path (`setState` + `createDocumentState.setByPath`) has been validated by
  `interpreter.test.ts` and `createDocumentState.test.ts`.
- The outbound path (`mutate` via `mutationHandler`, `command` via `commandHandler`) has
  been validated by `interpreter.mutation.test.ts` and `interpreter.test.ts`.
- The `action` conformance class proves the schema-level vocabulary acceptance.

The Draft status ("Do not build against this file alone yet") is now stale: all four
rules in the file are implemented and covered by tests. Leaving it Draft encourages drift
between the file and the code. Other runtimes (Flutter, Compose) need a stable contract
to implement against.

## Decision

Promote `spec/semantics/mutations.md` to **Approved for spec 1.x**.

The approved contract consists of:

1. **Scope boundaries** — only `state` is writable by a mutation; `data`, `route`, and
   `session` are read-only in render; `local` is runtime-managed (renderer-owned, not
   document-writable).
2. **Explicit set** — a mutation names a target path and a value; there are no
   fire-and-forget side effects.
3. **Dot-aware path writes** — `setByPath` creates missing intermediate objects and
   replaces non-mapping intermediates (including null) with `{}` before descending;
   siblings remain intact.
4. **Re-render trigger** — a mutation is the only document-driven reason a node's
   bindings re-evaluate; the batching mechanism is an implementation detail.

The outbound mutation surface (`mutate`, `command`) is also covered by Approved:
their fail-closed defaults, status/error/event-bus conventions, and error codes are
now stable (see `errors.md`).

Any future change to the path grammar, scope write rules, or outbound error codes
now requires an ADR.

## Alternatives considered

| Option | Why rejected |
|---|---|
| Keep mutations.md Draft until query/download actions land | Orthogonal — `query`/`download` are planned future-major vocab additions; their absence doesn't invalidate the four core rules that are already implemented and tested |
| Write a separate mutation.schema.json | Covered by `action.schema.json` (`setState`, `mutate`, `command` are the mutation actions) — a standalone schema adds no value today and would duplicate the action vocabulary |
| Promote only the inbound (setState) rules, leave outbound as Draft | Inconsistent — outbound mutations (`mutate`/`command`) are also implemented and conformance-tested; splitting the status creates confusion |

## Consequences

### Positive
- Other runtimes (Flutter, Compose) can build against a frozen contract.
- Conformance suite locks the path semantics — any regression in `setByPath` is caught.
- The file now carries the same weight as `expressions.md`, `bindings.md`, etc.

### Negative
- Any future change to path semantics (e.g., array-indexing grammar) now requires an
  ADR, not a quiet update — this is intentional.

### Neutral
- The `spec/README.md` Approved list is updated to include mutations.

## Follow-up

- [x] `spec/semantics/mutations.md` promoted to Approved with ADR reference
- [x] `spec/README.md` Approved list updated
- [x] ADR created in `docs/adr/`
