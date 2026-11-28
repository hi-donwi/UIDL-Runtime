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

## Reference-runtime component contract: `DataTable` column `statusColors`

A `DataTable` column with `format: "status"` renders each value as a coloured pill. The
runtime colours a small built-in set of status labels; any other label is gray. A column may
name the colour of its own labels with `statusColors`, which maps a label to a pill colour
(`gray`, `orange`, `green`, `red`, `yellow`, `blue`, `indigo`, `pink`, `purple`, `teal`):

```json
{
  "key": "status",
  "label": "Status",
  "format": "status",
  "statusColors": { "Approved": "green", "Waiting": "yellow", "Declined": "red" }
}
```

Labels are compared with the cell text trimmed and case-insensitively. Column entries win
over the built-in colours, which remain the fallback; an unknown colour renders gray. The map
keys are display labels, so a document in another language colours its own words without a
runtime change. This contract describes the current reference runtime; other renderers may
implement it as their DataTable adapters are brought to parity.

## Reference-runtime contract: runtime messages

Some text is rendered by the runtime itself rather than supplied by a document: the Drawer
close button, the Dialog close button, pagination controls, empty states, `check` cell text,
and the accessible names of tables, charts, row-action menus and generated codes. These
strings come from a message catalog the host selects, not from the document.

- `RenderOptions.locale` (a BCP 47 tag) picks a built-in catalog by exact tag, then by primary
  language subtag (`id-ID` -> `id`). Built-in catalogs are `en` (the default) and `id`. A tag
  without a catalog keeps English text.
- `RenderOptions.messages` overrides single messages over that catalog. A host whose language
  has no built-in catalog passes a complete catalog here.
- The same `locale` is the default number and date formatting locale for DataTable cells. A
  DataTable's own `locale` prop still wins.
- Text a document sets wins over the catalog: `closeLabel` on Drawer and Dialog, and the
  existing `emptyMessage`, `totalLabel`, `ariaLabel` and `rowActionPresentation` labels.

```tsx
<UIDocumentRenderer document={doc} locale="id" messages={{ closeDrawer: "Tutup formulir" }} />
```

Templates use `{name}` placeholders (`"Page {page} of {pages}"`) so a catalog stays plain JSON.
`RuntimeMessagesProvider` and `useRuntimeMessages` let a host component outside a rendered
document share the same messages. The catalogs are exported from the React-free
`uidl-runtime/recipes` entry too, and the form recipe emits its lookup states (`loading`,
`optionsLoadFailed`, `optionsEmpty`, `selectPlaceholder`) in the compile language. The Flutter
and Android runtimes do not read this catalog yet.
