# Events — turning user input into actions

*Status: **Approved** for spec 1.x. ADR: `docs/adr/0006-events-approved.md`.
Model: `packages/core/src/renderer/RenderNode.tsx` event routing, and the component
registry's per-node-kind `events` declarations
(`packages/core/src/registry/defaults.ts`).*

An **event** is an occurrence a node can react to. A document wires an event name to an
**action list**:

```json
{
  "events": {
    "onChange": [{ "setState": { "path": "state.input", "value": { "$bind": "event.value" } } }]
  }
}
```

## Rules

1. **Events fire actions, never code.** The event wiring is data; reacting is always
   one or more declarative actions.
2. **Events are captured at the platform boundary.** When an event fires it may capture
   a small plain object bound as `event.*` for the duration of the action run. There is
   no arbitrary host event object in scope — a document cannot reach host internals.
3. **A node kind's supported events are declared, not guessed.** The component registry
   advertises a supported vocabulary per node kind and a document wires only names in
   it; the reference compiler emits only supported names. Wiring an unsupported name is
   a document bug: the reference renderer passes it through to the platform renderer
   where it never fires. Enforcement as `UNSUPPORTED_EVENT` is a reserved future minor —
   never a web-platform exception.
4. **Multiple actions run in order.** The action list is a sequence; the pipeline stops
   at the first failing action and reports it (no silent continuation).
5. **`event` is not a render value.** See `bindings.md` — `event.*` in a render
   expression is `undefined`.

## Vocabulary (spec 1.x)

The registry declares, per node kind, which events it plumbs. The union across the
reference component library for spec 1.x:

| Event | Node kinds (examples) | Capture |
|---|---|---|
| `onChange` | Form widgets: TextField, Checkbox, Switch, Slider, Select, Textarea, RadioGroup | plain value (`event.value`) |
| `onBlur` / `onFocus` | Form widgets | host-defined payload |
| `onClick` | Button, Card, list rows | host-defined payload |
| `onSubmit` | Form | host-defined payload |
| `onRowAction` / `onOpen` | DataTable | the row object (`event.<row-field>`) |
| `onPageChange` / `onPageSizeChange` | DataTable page bar | plain value |
| `onCardClick` / `onNodeClick` / `onClose` | Card, Tree, Dialog | host-defined payload object |

**Capture contract.** The captured value is whatever the platform renderer hands to the
wired handler: a plain value for a control or page event, the row object for DataTable
row events, and a host-supplied payload object for the rest (row records may carry
host-derived fields — the typical table-open flow binds `event.route`). `{"$bind":
"event"}` resolves the whole capture, `{"$bind": "event.<path>"}` a field within it.
`setState`'s `value: null` convention means "use what the event carried"
(`mutations.md`).

## Not in scope for spec 1.x (planned)

- Gestures (swipe, long-press), keyboard access keys, drag-and-drop payload shapes.
- A framework-independent lowercase alias vocabulary (`change`, `click`, `press`, …).
- Parse-time enforcement of the supported-event set per node kind — `UNSUPPORTED_EVENT`
  stays a reserved marker in the taxonomy (`errors.md`); nothing raises it in 1.x.
- Mount/unmount lifecycle events — lifecycle is host-driven (`lifecycle.md`).