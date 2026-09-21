# Actions — declarative behaviour

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0003-actions-approved.md`,
`docs/adr/0005-query-action-approved.md`.
Model: `packages/core/src/types/actions.ts`,
`packages/core/src/schemas/actions.ts`, `packages/core/src/actions/interpreter.ts`.
The **extension** action mechanism (host-registered custom kinds) is **explicitly out of
scope for spec 1.x** (see below) and stays rejected as `UNKNOWN_ACTION`.*

A **document has no code** — behaviour is a declarative list of **actions** attached
to events (see `events.md`). Each action is an object whose **top-level key** is the
action kind; the reference runtime's vocabulary is fixed (see `schema/action.schema.json`,
which mirrors `schemas/actions.ts` exactly). An action that matches no known kind is
reported as **`UNKNOWN_ACTION`** — never silently ignored.

## Vocabulary

```json
{"sequence": [<action>, ...]}                        Run in order; if any member reports, stop.
{"if": {"condition": <object>, "then": <action>,     Branch; "else" is optional.
        "else": <action>}}
{"setState": {"path": "<state.<dotted>>", "value": <value | $bind | $expr>}}
{"navigate": {"route": "<route string | {name, params}>"}}
{"api": {"url": "<string>", "method": "GET"|"POST"|"PUT"|"DELETE",
         "body"?: {...}, "dataSource"?: "<state path>"}}
{"mutate": {"operation": "create"|"update"|"delete"|"transition",
            "collection": <resolvable>, "id"?: <resolvable>,
            "payload"?: <resolvable>, "transition"?: <resolvable>,
            "version"?: <resolvable>,
            "resultPath"?: ..., "errorPath"?: ..., "fieldErrorsPath"?: ...,
            "statusPath"?: ..., "onSuccess"?: <action>, "onError"?: <action>}}
{"command": {"name": <resolvable>, "payload"?: <resolvable>,
             "resultPath"?: ..., "errorPath"?: ..., "statusPath"?: ...,
             "onSuccess"?: <action>, "onError"?: <action>}}
{"download": {"url": <resolvable>, "filename"?: <resolvable>,
              "resultPath"?: ..., "errorPath"?: ..., "statusPath"?: ...,
              "onSuccess"?: <action>, "onError"?: <action>}}
{"query": {"target": "<declared $query data source name>",
           "onSuccess"?: <action>, "onError"?: <action>}}
{"showSnackbar": {"message": "<string>", "duration"?: <number>}}
{"showDialog": {"title": "<string>", "content": "<string>"}}
{"validate": {"fields": ["<input name>", ...]}}
```

A **resolvable** value is a literal or one of two markers: `{"$bind": "event.<path>"}`
(single-field or whole-`event`) or `{"$expr": <expression>}` (evaluated against the
current scope). `setState` may pass `null` as `value` to mean "use whatever the change
event produced" — the documented two-way form-binding convention.

The `download` action delegates to a host `downloadHandler` and is fail-closed: it
refuses to run (reporting through the error pipeline and a snackbar) when no handler is
wired — the address and suggested name are resolved via the action's resolvables, and
the handler owns scheme/sanitisation rules.

The `query` action re-runs one **declared `$query` data source by name** (queries.md).
It is fail-closed too: with no `dataAdapter`, no state store, or a target that is not a
declared `$query` entry, it reports (`query-response` with `success: false` + a
snackbar) instead of silently doing nothing. Results and status land in the same place
the mount/refresh loop writes: `state.$data.<target>.{status,rows,total,error}`, and
`onSuccess` runs once the target resolves. This is the "run a query on mount" / refresh
mechanism — no separate lifecycle hook exists (lifecycle.md).

## Out of scope for spec 1.x

The **extension** mechanism (host-registered custom kinds) is **planned for a future
major**. Until then the vocabulary above is fixed: strict consumers reject extension or
any other unrecognised kind with `UNKNOWN_ACTION`. The runtime intentionally rejects
them today — see `ActionInterpreter.run`.

## Rules

1. **Actions never run at parse time.** An action only fires when its event fires.
   A parse/render pass never mutates `state`, never navigates, never fetches.
2. **`event` scope exists only at action time.** When an action fires, the triggering
   event's captured fields are available as `event.*` (via `resolveEventBind` in the
   reference runtime) — e.g. `event.value` for an input change. Inside a render
   expression the same reference is `undefined` (see `bindings.md`).
3. **`setState` targets `state` only, never `data`/`route`/`session`** (mutations.md);
   the path is validated at execution and a bad path reports `INVALID_STATE`.
4. **`api`/`mutate`/`command`/`download`/`query` are fail-closed by default.** `api`
   refuses to run without an allowlist; `mutate`, `command`, and `download` refuse
   without a host handler; `query` refuses without a `dataAdapter` (or for a target
   that is not a declared `$query` source). Their responses (success or failure) are
   emitted on the event bus (`api-response`, `mutation-response`, `command-response`,
   `download-response`, `query-response`) and failures also surface a snackbar.
5. **Failures are reported, not silent.** Unknown action kind → `UNKNOWN_ACTION`.
   Undefined bind target → `INVALID_STATE`. Both flow through the documented error
   pipeline (errors.md) and are observable via `ActionInterpreter.run` (errors.md —
   a report, not a swallowed console warning).

## Reference implementation

`ActionInterpreter` (`packages/core/src/actions/interpreter.ts`) dispatches on the
top-level discriminator key. `execute()` runs actions and only warns in dev;
`run(action)` returns an `ActionReport` with `{ ok, code }` so hosts and conformance
suites can assert failures deterministically. Validate action nodes against
`schema/action.schema.json` (mirrors `ActionSchema` in `schemas/actions.ts`).