/*
 * Shared UIDL node builders in Meridian's layout language.
 *
 * Everything the demo documents assemble — list pages, forms, report pages, dashboard
 * sections — is built from these, so the spacing rules live in one place instead of being
 * retyped (and drifting) per page. Each builder names the surface it lays out.
 *
 * The recurring measurements:
 *
 *   page header   FormHeader      h-row-large (3.5rem), px-4, text-xl font-semibold
 *   section head  SectionHeader   flex items-baseline justify-between, text-base semibold
 *   dashboard box Dashboard       p-4 regions, divided by `hr` / `border-e`, never boxed
 *   list row      List            h-row-mid (3rem), 1rem grid gap, w-8 index gutter, hr
 *   form row      TwoColumnForm   1fr/1fr grid, h-row-mid, border-b, label `ps-4`
 *   form shell    FormContainer   w-form (600px) card, `border rounded-lg shadow-lg mx-4`
 */

import type { UIDLNode } from "~/types";
import { resolveActionIcon } from "./icons";

export interface ListColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface ListRecord {
  route: string;
  cells: Record<string, string>;
}

const BORDER = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

export function text(
  id: string,
  value: string,
  style?: Record<string, unknown>,
  textAlign?: "left" | "right" | "center",
  heading?: 1 | 2 | 3 | 4 | 5 | 6,
): UIDLNode {
  return {
    id,
    type: "Text",
    // textAlign has no StyleIntent field (no whitelisted text-align enum exists yet) — set via
    // props.style, which RenderNode merges as literal inline CSS regardless of the StyleIntent
    // whitelist (see finalStyle = {...inlineStyle, ...propsStyle} in RenderNode.tsx).
    props: { value, ...(heading ? { heading } : {}), ...(textAlign ? { style: { textAlign } } : {}) },
    style,
  };
}

/**
 * Button: `h-8 rounded-md text-sm`, `px-6` (or `px-3` for icons), primary = near-black
 * fill, secondary = gray-200. The widget itself now applies all of that from `variant`, so a
 * document only has to say which one it wants.
 */
export function button(
  id: string,
  label: string,
  route: string,
  variant: "primary" | "secondary" = "secondary",
  iconName?: string,
): UIDLNode {
  return {
    id,
    type: "Button",
    // The icon is derived from the verb when the caller does not name one, so every action
    // button carries a mark without each call site having to remember one.
    props: { label, variant, iconName: iconName ?? resolveActionIcon(label) },
    events: { onClick: [{ navigate: { route } }] },
  };
}

/**
 * A button that fires a real `transition` mutation against `collection`, then navigates on
 * success — the same shape buildFormPage.ts's `buildTransitionButton` uses, so the Meridian
 * invoice form can drive `meridianSalesInvoiceService` through the mutation contract.
 */
export function transitionButton(
  id: string,
  label: string,
  collection: string,
  transition: string,
  onSuccessRoute: string,
  variant: "primary" | "secondary" = "primary",
): UIDLNode {
  return {
    id,
    type: "Button",
    props: { label, variant, iconName: resolveActionIcon(label) },
    events: {
      onClick: [
        {
          mutate: {
            operation: "transition",
            collection,
            id: { $expr: { path: "state.id" } },
            transition,
            statusPath: "formStatus",
            resultPath: "savedRecord",
            errorPath: "formError",
            fieldErrorsPath: "formErrors",
            onSuccess: { navigate: { route: onSuccessRoute } },
          },
        },
      ],
    },
  };
}

/**
 * StatusPill's `statusColorMap` now lives in core (`utils/listCell`) so the live,
 * query-driven DataTable and this build-time path colour a status identically. Re-exported
 * here because the Meridian documents have always imported it from this module.
 */
export { statusColor } from "~/utils/listCell";
import { statusColor } from "~/utils/listCell";

/** Column keys whose values Meridian renders as a StatusPill rather than plain text. */
const STATUS_KEYS = new Set(["status", "state", "paymentStatus", "docStatus"]);

/** FormHeader — the in-page title bar (the shell's PageHeader carries the route title). */
export function meridianPageHeader(title: string, actions: UIDLNode[] = [], id = "page-header"): UIDLNode {
  return {
    id,
    type: "Navbar",
    style: {
      justifyContent: "space-between",
      alignItems: "center",
      padding: "px-4",
      height: "h-row-large",
      borderWidth: "border-b",
      borderColor: BORDER,
    },
    children: [
      text(`${id}-title`, title, { fontSize: "text-xl", fontWeight: 600 }, undefined, 1),
      {
        id: `${id}-actions`,
        type: "Toolbar",
        style: { display: "flex", alignItems: "center", gap: "gap-2" },
        children: actions,
      },
    ],
  };
}

/** SectionHeader */
export function meridianSectionHeader(id: string, title: string, action?: UIDLNode): UIDLNode {
  return {
    id,
    type: "Row",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "px-4 py-2.5",
      background: "{primitives.color.surface}",
      borderWidth: "border-b",
      borderColor: BORDER,
    },
    children: [
      text(
        `${id}-title`,
        title,
        {
          fontSize: "text-sm",
          fontWeight: 600,
          color: TEXT_SECONDARY,
        },
        undefined,
        2,
      ),
      ...(action ? [action] : []),
    ],
  };
}

/**
 * A row of headline figures.
 *
 * Meridian's dashboard has no KPI cards at all, so there is no class list to copy — what it does
 * have (Dashboard) is a row of `p-4` regions separated by `border-e`, with no card border,
 * radius or shadow anywhere. That is the treatment used here, so the row reads as part of the
 * page rather than as tiles floating on it.
 */
export function meridianKpiRow(id: string, kpis: Array<[string, string]>): UIDLNode {
  return {
    id,
    type: "GridView",
    props: {
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))`,
      },
    },
    style: { borderWidth: "border-b", borderColor: BORDER },
    children: kpis.map(([label, value], index) => ({
      id: `${id}-${index}`,
      type: "Column",
      style: {
        padding: "p-4",
        gap: "gap-2",
        ...(index < kpis.length - 1 ? { borderWidth: "border-e", borderColor: BORDER } : {}),
      },
      children: [
        text(`${id}-${index}-label`, label, { fontSize: "text-base", fontWeight: 600 }),
        text(`${id}-${index}-value`, value, { fontSize: "text-2xl", fontWeight: 600 }),
      ],
    })),
  };
}

/** Dashboard's section: a `p-4` region, optionally closed by a bottom rule. */
export function meridianDashboardSection(
  id: string,
  children: UIDLNode[],
  options: { border?: boolean; borderEnd?: boolean } = {},
): UIDLNode {
  const { border = true, borderEnd = false } = options;
  return {
    id,
    type: "Column",
    style: {
      padding: "p-4",
      gap: "gap-4",
      ...(border || borderEnd
        ? { borderWidth: borderEnd ? "border-e" : "border-b", borderColor: BORDER }
        : {}),
    },
    children,
  };
}

/**
 * List: a clickable, per-row-navigable list.
 *
 * Deliberately not the `DataTable` widget — every row here carries its own already-resolved
 * `navigate` route, generated in TypeScript, because per-row action bindings (`repeat` +
 * `local.*`) do not exist in the runtime yet. The structure is List's: an index gutter
 * outside the grid, a 1rem-gapped grid for the columns, `h-row-mid` rows on a plain
 * background, a rule between every row, and `hover:bg-gray-50` as the only fill.
 */
export function meridianList(id: string, columns: ListColumn[], records: ListRecord[]): UIDLNode {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
    gridGap: "1rem",
    alignItems: "center",
  };

  const headerCells = columns.map((column, index) =>
    text(
      `${id}-head-${index}`,
      column.label,
      {
        display: "flex",
        alignItems: "center",
        height: "h-row-mid",
        ...(column.align === "right" ? { justifyContent: "end" } : {}),
        ...(index === columns.length - 1 ? { padding: "pe-4" } : {}),
      },
      column.align,
    ),
  );

  const headerRow: UIDLNode = {
    id: `${id}-head`,
    type: "Row",
    style: { display: "flex", alignItems: "center", color: TEXT_SECONDARY, fontSize: "text-base" },
    children: [
      text(`${id}-head-index`, "#", { width: "w-8", margin: "me-2" }, "right"),
      {
        id: `${id}-head-cells`,
        type: "Row",
        props: { style: gridStyle },
        style: { width: "w-full", height: "h-row-mid" },
        children: headerCells,
      },
    ],
  };

  const rows: UIDLNode[] = records.flatMap((record, rowIndex) => {
    const row: UIDLNode = {
      id: `${id}-row-${rowIndex}`,
      type: "Container",
      props: { className: "flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-850" },
      events: { onClick: [{ navigate: { route: record.route } }] },
      children: [
        text(`${id}-row-${rowIndex}-index`, String(rowIndex + 1), { width: "w-8", margin: "me-2", color: TEXT_SECONDARY }, "right"),
        {
          id: `${id}-row-${rowIndex}-cells`,
          type: "Row",
          props: { style: gridStyle },
          style: { width: "w-full", height: "h-row-mid", fontSize: "text-base" },
          children: columns.map((column, cellIndex) => {
            const value = record.cells[column.key] ?? "";
            const lastCellStyle = cellIndex === columns.length - 1 ? { padding: "pe-4" } : {};

            if (STATUS_KEYS.has(column.key) && value) {
              return {
                id: `${id}-row-${rowIndex}-cell-${cellIndex}`,
                type: "Row",
                style: {
                  display: "flex",
                  alignItems: "center",
                  ...(column.align === "right" ? { justifyContent: "end" } : {}),
                  ...lastCellStyle,
                },
                children: [
                  {
                    id: `${id}-row-${rowIndex}-cell-${cellIndex}-pill`,
                    type: "Badge",
                    props: { label: value, color: statusColor(value), variant: "pill" },
                  },
                ],
              } satisfies UIDLNode;
            }

            return text(
              `${id}-row-${rowIndex}-cell-${cellIndex}`,
              value,
              {
                display: "flex",
                alignItems: "center",
                ...(column.align === "right" ? { justifyContent: "end" } : {}),
                ...lastCellStyle,
              },
              column.align,
            );
          }),
        },
      ],
    };

    const divider: UIDLNode = {
      id: `${id}-row-${rowIndex}-divider`,
      type: "Divider",
      style: { borderColor: BORDER },
    };

    return rowIndex === records.length - 1 ? [row] : [row, divider];
  });

  return {
    id,
    type: "Column",
    style: { fontSize: "text-base" },
    children:
      records.length > 0
        ? [headerRow, { id: `${id}-head-divider`, type: "Divider", style: { borderColor: BORDER } }, ...rows]
        : [
            headerRow,
            { id: `${id}-head-divider`, type: "Divider", style: { borderColor: BORDER } },
            text(`${id}-empty`, "No entries found", {
              padding: "p-8",
              color: TEXT_SECONDARY,
              display: "flex",
              justifyContent: "center",
            }),
          ],
  };
}

/**
 * TwoColumnForm: label and control share one `h-row-mid` grid row closed by a `border-b`;
 * the label sits in the start column at `ps-4 text-gray-600`, the control in the end column
 * at `py-2 pe-4`. No field boxes, no per-field spacing — the rules do the separating.
 */
export function meridianFormRow(id: string, label: string, control: UIDLNode): UIDLNode {
  return {
    id,
    type: "Row",
    props: { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "center" } },
    style: { borderWidth: "border-b", borderColor: BORDER, minHeight: "min-h-row-mid" },
    children: [
      text(`${id}-label`, label, { padding: "ps-4", color: TEXT_SECONDARY, fontSize: "text-base" }),
      {
        id: `${id}-control`,
        type: "Column",
        style: { padding: "py-2 pe-4" },
        children: [control],
      },
    ],
  };
}

/**
 * FormContainer: the form floats as a `w-form` (600px) card on the gray-25 page — the one
 * place in Meridian where a border, radius and shadow are all used together.
 */
export function meridianFormShell(id: string, children: UIDLNode[]): UIDLNode {
  return {
    id,
    type: "Column",
    style: {
      width: "w-form",
      maxWidth: "max-w-full",
      margin: "mx-4 mb-4",
      background: "{primitives.color.surface-elevated}",
      borderWidth: "border",
      borderColor: BORDER,
      borderRadius: "rounded-lg",
      shadow: "{primitives.shadow.lg}",
    },
    children,
  };
}

/** FormContainer's page background — gray-25 behind a centered form card. */
export function meridianFormPage(children: UIDLNode[]): UIDLNode {
  return {
    id: "page",
    type: "Column",
    style: {
      // FormContainer centres the card with `self-center`; a Column is a plain div, so the
      // flex context has to be declared here for `items-center` to mean anything.
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "{primitives.color.surface}",
      minHeight: "min-h-full",
      paddingTop: "pt-4",
    },
    children,
  };
}
