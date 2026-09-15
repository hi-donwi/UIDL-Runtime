# Bindings — `$bind` and the binding path grammar

*Status: **Approved** for spec 1.x. Implemented by `packages/core/src/state/bindings.ts`
(`resolvePath`, `isBindPath`) and used by the reference renderer and evaluator.
Segment grammar amended by ADR-0007 (reserved `$data` namespace under `state`).*

A binding is a reference to a value in the render scope, written as a string:

```
binding        := scope "." dotted-name
scope          := "local" | "state" | "session" | "route" | "data"
dotted-name    := segment ( "." segment )*
segment        := [^.]+                                -- one or more non-dot chars
```

A segment is a plain key lookup: any characters except the separator dot (matching
`schema/binding.schema.json`'s `[^.]+`). `$data` is a **reserved namespace under
`state`** (`state.$data.<key>.{status,rows,total,error}`, `state.md`) owned by the
runtime; a document resolves it for reading but never writes it (`mutations.md`).

Examples: `state.user.name`, `local.index`, `data.rows`, `route.orderId`,
`session.activeUser`, `state.$data.invoices.status`.

## Rules

1. **Five render scopes only.** `local`, `state`, `session`, `route`, `data`. Any
   other leading segment is not a binding.
2. **`event` is not a render scope.** An `event.<path>` reference exists only at
   action time as a **captured value**, bound by whatever fired the action. Inside a
   render expression it is an unknown prefix and resolves to `undefined`.
3. **Dotted access only.** Every segment is a plain key lookup into the object at
   that level. There is no array-indexing grammar in a binding path; a segment is a
   literal name or a numeric literal accessed as a key. Values holding arrays are
   accessed whole (`data.rows`), and operating over whole arrays is the job of
   `over` in an aggregation expression.
4. **Resolution is total and non-throwing.** Unknown prefix, missing scope, missing
   key anywhere along the path, and non-object trap along the way all resolve to
   **`undefined`**. A binding never throws.
5. **`undefined` is `undefined`.** A binding to a missing key is `undefined` and is
   indistinguishable from *the scope not having that key at all*. `??`/`coalesce`
   exists so authors can give missing values a fallback.

## Where bindings appear

A binding appears as a string value in exactly these positions — never interleaved by
accident in arbitrary text:

- A `$bind` leaf: `{"$bind": "state.total"}`, usable as an operand anywhere an
  expression node is accepted.
- A `path` operand in legacy expression shape: `{"path": "state.total"}` — an alias
  of the `$bind` leaf with identical semantics.
- A prop value of the form `{"$bind": "..."}` under a node's `bind` map
  (`components/*/props`), resolved by the renderer when materializing props.
- The `over` operand of an aggregation expression.

A bare `{"path": "user.name"}` (no scope prefix) is not a binding — see
`expressions.md` for path shape handling; the reference runtime treats a scopeless
path as a binding attempt with an unknown prefix and resolves it to `undefined`.

## Validation

`schema/binding.schema.json` states the grammar. A renderer that exposes a
schema-driven validation pipeline should reject bindings that fail the pattern with a
`VALIDATION` error, while keeping **runtime resolution total**: an invalid binding
inside an already-rendering tree resolves to `undefined`, it never aborts the frame.