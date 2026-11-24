# Component model — `packages/uidl-component`

*Status: **Planned**.*

## Ledger

| Date | File | Notes |
|---|---|---|
| — | `packages/uidl-component/package.json` | package.json planned but not yet created |

## Contract rule

`packages/uidl-component` is the neutral component registry and contract. No
`packages/*` source file may import it directly (dependency goes the other direction:
components import the registry). See `docs/architecture/target-state.md` §14 and the
migration-plan component step for the rationale.

## Reference-runtime component contract: `DataTable.rowActions`

The component model is not yet renderer-neutral, but the reference runtime accepts
`rowActions` on `DataTable`. Each action has a `label`, an optional `event` name, and an
optional `visibleWhen` UIDL expression. `visibleWhen` is evaluated separately for each
row, with that row available as `data.row`; for example:

```json
{
  "label": "Download CV",
  "event": "onDownload",
  "visibleWhen": {
    "op": "eq",
    "left": { "$bind": "data.row.cvScanStatus" },
    "right": { "literal": "clean" }
  }
}
```

An omitted `visibleWhen` preserves the existing always-visible behavior. A configured
condition whose evaluated result is falsey hides that action for the row. This controls
the UI affordance only; the action handler must still enforce authorization and business
rules when it executes.

The reference runtime also accepts an optional `rowActionPresentation` object:

```json
{
  "mode": "menu",
  "triggerLabel": "More",
  "triggerAriaLabel": "Invoice actions",
  "menuLabel": "Invoice action menu",
  "columnAriaLabel": "Invoice action column"
}
```

`mode` is `buttons` or `menu`; when omitted, the runtime preserves inline buttons.
Trigger, menu and column labels can be localized by the document author. The menu includes
only actions visible for the current row. This is presentation behavior, not authorization.
This contract describes the current reference runtime; other renderers may implement it
as their DataTable adapters are brought to parity.
