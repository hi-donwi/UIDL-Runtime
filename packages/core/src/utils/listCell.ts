/*
 * ListCell's cell semantics, as pure functions.
 *
 * Meridian renders a list cell through its column format rule and right-aligns it when
 * `isNumeric(column.fieldtype)` (ListCell + src/utils.ts).
 * Status columns are the exception: they go through a `render` that returns a StatusPill
 * (StatusPill, `statusColorMap`).
 *
 * The static Meridian reference reproduced that in `templates/src/meridian/meridianLayout.ts` by baking
 * formatted strings into the document at build time. A list driven by a live `$query` has no
 * build step to bake into, so the same rules have to live in the widget — which is what this
 * file gives it. Keeping them here (not in the widget file) keeps them testable without React
 * and lets the static path import the very same status map instead of keeping a second copy.
 */

/** StatusPill — `statusColorMap`. */
const STATUS_COLORS: Record<string, string> = {
  draft: "gray",
  cancelled: "red",
  outstanding: "orange",
  "not transferred": "orange",
  "not saved": "orange",
  "not submitted": "orange",
  paid: "green",
  lunas: "green",
  saved: "blue",
  submitted: "blue",
  return: "gray",
  "return issued": "gray",
  unpaid: "red",
  "belum bayar": "red",
  overdue: "red",
  "partly paid": "yellow",
  "partially paid": "yellow",
  pending: "yellow",
  expired: "red",
  active: "green",
  maxed: "orange",
  // Order/quotation lifecycle labels the Meridian map has no entry for, coloured on the same
  // logic it uses elsewhere: open work is blue, a completed outcome green, a dead one red.
  open: "blue",
  won: "green",
  lost: "red",
  fulfilled: "green",
  closed: "gray",
  archived: "gray",
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status.trim().toLowerCase()] ?? "gray";
}

/**
 * How a column's values are printed. Mirrors the `fieldtype` distinctions Meridian's formatter
 * actually branches on, not the full widget list — `text` is everything with no special rule.
 */
export type CellFormat = "text" | "currency" | "number" | "integer" | "date" | "status" | "check";

/** `isNumeric` in utils.ts — the fieldtypes Meridian right-aligns. */
export function isNumericFormat(format: CellFormat | undefined): boolean {
  return format === "currency" || format === "number" || format === "integer";
}

export interface CellFormatOptions {
  /** BCP 47 tag for number/date formatting. Meridian uses the instance's locale. */
  locale?: string;
  /** ISO 4217 code. When set, `currency` columns print with the symbol. */
  currency?: string;
  /** Decimal places for `number` columns — SystemSettings.displayPrecision upstream. */
  precision?: number;
}

/**
 * fyo/utils/format.ts branches per fieldtype, and only Currency gets a symbol:
 *
 *   Float     `Number(value).toFixed(displayPrecision)` — a plain decimal, no grouping
 *   Int       `Math.trunc(Number(value)).toString()`    — no grouping either
 *   Currency  `formatCurrency(...)`                     — symbol + locale grouping
 *
 * The distinction matters beyond cosmetics: a "Rate %" column is a Float, and formatting it
 * as Currency printed `IDR 2` for a 2% withholding rate.
 */
function formatNumeric(value: number, format: CellFormat, options: CellFormatOptions): string {
  if (format === "currency") {
    const locale = options.locale ?? "en-US";
    // Meridian prints money with the company currency and its own precision. Zero-decimal
    // currencies (IDR, JPY) would otherwise render a misleading ",00" tail, so the fraction
    // digits are left to Intl's per-currency default rather than pinned here.
    return options.currency
      ? new Intl.NumberFormat(locale, { style: "currency", currency: options.currency }).format(value)
      : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  if (format === "integer") return String(Math.trunc(value));
  return value.toFixed(options.precision ?? DEFAULT_DISPLAY_PRECISION);
}

/** SystemSettings.displayPrecision — Meridian ships 2. */
const DEFAULT_DISPLAY_PRECISION = 2;

/**
 * Returns the printable text for a cell, or `null` when the caller should render a status pill
 * instead (the one case Meridian does not render as text).
 */
export function formatCellValue(
  value: unknown,
  format: CellFormat | undefined,
  options: CellFormatOptions = {},
): string {
  if (value === undefined || value === null) return "";

  // fyo/utils/format.ts: `titleCase(Boolean(value).toString())`.
  if (format === "check") return value ? "True" : "False";

  if (format === "date") {
    // A value that is not a real date must survive as itself — a half-typed filter value or a
    // free-text column mistagged as a date should not silently print "Invalid Date".
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(options.locale ?? "en-US", { dateStyle: "medium" }).format(date);
  }

  if (isNumericFormat(format)) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return formatNumeric(numeric, format as CellFormat, options);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
