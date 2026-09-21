# Mutations — changing `state`

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0001-mutations-semantics-approved.md`.
Implemented by `packages/core/src/state/createDocumentState.ts` (`setByPath`,
`DocumentStateStore.setState`) and exercised by the action interpreter
(`setState`/`mutate`/`command`).*

Where **queries** bring data *in*, **mutations** change `state` (and, rarely, are the
data-side counterpart that pushes changes *out* through actions). This file is the
approved contract for the document-visible mutation surface.

## Kinds

| Kind | Effect | Document-visible? |
|---|---|---|
| **Local mutation** | Writes into the `state` scope | Yes — the primary use of `state` |
| **Outbound mutation** | Sends data to a backend and (usually) refreshes affected `data` | Via actions; transport out of scope |

## Rules

1. **Only `state` is writable by a mutation.** `data`, `route`, and `session` are
   read-only in render; `local` is runtime-managed per node subtree (see `bindings.md`
   and the renderer). A mutation that names another scope is a validation error, not a
   silent no-op.
2. **A mutation is an explicit set, not a fire-and-forget side effect.** The action
   language (see `actions.md`) names the target path and the new value; the runtime
   applies it transactionally within the document's state model. The two mutation
   surfaces in the vocabulary are:
   - **`setState`** — inbound: writes `state.<path>` directly via
     `DocumentStateStore.setState`.
   - **`mutate` / `command`** — outbound: delegates to a host handler and surfaces the
     result through status/error state + the event bus (`mutation-response`,
     `command-response`).
3. **Writes are shallow-path but dot-aware.** Setting `state.form.status` overwrites
   that leaf, leaving siblings intact. Missing intermediate objects are created as
   plain `{}` mappings. Setting a path that resolves through a non-mapping value (or
   `null`) replaces that value with `{}` before descending — see `setByPath` in the
   reference runtime.
4. **After a mutation, the referencing subtree re-renders.** Which subtrees re-render
   and how the schedule is batched is an implementation decision, but a mutation is
   the only document-driven reason a node's bindings re-evaluate.

## Fail-closed defaults

- `mutate` and `command` refuse to run without a host handler; the refusal is reported
  on the event bus (`mutation-response`/`command-response` with `success: false` and the
  refusal message) plus a snackbar, never a silent no-op. The `code` field carries the
  host handler's error code when one is set (e.g. a `DataError.code`), otherwise it is
  absent — the taxonomy (errors.md) does not define a separate "disabled" code for spec
  1.x.
- `api` actions are fail-closed by default (require an allowlist) — see `actions.md`.
