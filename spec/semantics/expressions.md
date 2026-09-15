# Expressions — the expression grammar

*Status: **Approved** for spec 1.x. Implemented by `packages/core/src/expr/evaluate.ts`.*

An **expression** evaluates to a plain JSON value. It is a tree of **expression
nodes**; a node is either a leaf or one of the shapes below. Evaluation is
deterministic, total (never throws for well-formed input), and **executes no host
code**.

## Leaves

| Shape | Evaluation |
|---|---|
| `{"literal": <value>}` | The wrapped value. `{"literal": null}` is `null`, not a missing marker. |
| `{"path": "<binding>"}` | A legacy alias of binding resolution: `resolvePath(path, scope)` (see `bindings.md`). |
| `{"$bind": "<binding>"}` | Binding resolution — canonical form of `path`. |
| `{"$expr": <Expr>}` | A wrapper carrying an expression as a value; evaluates to the inner expression's result. |
| `{"agg": <op>, "over": <binding>, "field"?: <key>}` | Aggregate `sum`, `count`, or `avg` over the collection at `over`; rows that are not objects, or not numbers under `field`, are skipped. `count` needs no field. A missing collection aggregates to `0`. |

A non-object expression (bare number, string, boolean, `null`) evaluates to itself.

## Binary & unary operators — canonical form

```
{"op": <op>, "left": <Expr>, "right": <Expr>}      # binary
{"op": "not", "v": <Expr>}                          # unary
{"op": "if", "test": <Expr>, "then": <Expr>, "else": <Expr>}
```

| Op | Operands | Result |
|---|---|---|
| `eq` / `neq` | any | **Strict** value equality (`===` / `!==`), including cross-type: `1` vs `"1"` is not equal. `undefined` === `undefined`. |
| `gt` `gte` `lt` `lte` | number | **Numeric comparison.** Non-numerics are coerced with `Number()`; text with a number shape ("5") coerces, junk coerces to `NaN` → result `null`. Operands that are not finite numbers give `null`, never a throw. |
| `and` | any | Operands are coerced with `Boolean()`, true when both are truthy. |
| `or` | any | False when both are falsy, otherwise true. |
| `not` | any | `!Boolean(operand)` on `v`. |
| `add` `subtract` `multiply` | number | Numeric arithmetic with the same coercion and `null`-on-junk rule as comparisons. |
| `divide` | number | Numeric division; **divide by zero yields `null`**, never `Infinity`/`NaN`. |
| `contains` | collection, value | Strict element membership (`===`) for arrays; substring (`includes`) for strings. Wrong container type → `null`. |
| `startsWith` | string, string | `String.prototype.startsWith`. Either operand not a string → `null`. |
| `coalesce` | any | `left` if not `null`/`undefined`, else `right`. |

`eq` is the only objectwise-safe operator: for non-primitive operands it is
**reference equality**, so comparing two separately-constructed objects is `false`.

## Legacy keyed shapes — still valid, same semantics

Historically the grammar keyed operators by their symbol. These remain accepted with
**identical** semantics and are exact aliases of the canonical ops above:

| Legacy shape | Canonical equivalent |
|---|---|
| `{"==": [l, r]}` | `eq` |
| `{"!=": [l, r]}` | `neq` |
| `{"and": [l, r]}` | `and` |
| `{"or": [l, r]}` | `or` |
| `{"not": <E>}` | `not` (on `v`) |
| `{"if": [c, t, f]}` | `if` |
| `{"??": [l, r]}` | `coalesce` |

A document may mix canonical and legacy shapes in one tree.

## Any node that is a value

Wherever an expression node is accepted, a **plain value** (number, string, boolean,
`null`) is accepted too and evaluates to itself. Either operand position may receive
another expression node, including nested canonical ops and `$bind` leaves.

## Unrecognised input

An object node that is none of the above shapes — an unknown `op`, an `agg` missing
`over`, a node with no recognized key — evaluates to `undefined`. This keeps
evaluation **total**: a partially-migrated document degrades to missing values rather
than crashing the frame.

## Depth bound

Evaluation is depth-bounded. Any tree deeper than `MAX_EXPR_DEPTH` (64) resolves to
**`undefined`** for the whole expression. UIDL documents are untrusted input; this is
the one hard guarantee against pathological trees, and the reference runtime enforces
it without relying on the host platform's call-stack limits.

## Events do not evaluate

`event` is not a render scope. Any `event.*` reference inside a render expression is
an unknown prefix and resolves to `undefined`; `event` only enters behaviour through
action capture (see `actions.md`).