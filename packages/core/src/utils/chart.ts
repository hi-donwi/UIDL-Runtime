/*
 * Chart helpers shared by the chart components — shared by the Meridian surfaces.
 *
 * Kept out of components/charts.tsx so that module exports components only (the palettes and
 * the formatter are plain values, and mixing them in breaks React Fast Refresh).
 */

/** utils/chart.ts — y-axis labels as "1 K" / "12 M" / "3 B". */
export function prefixFormat(value: number): string {
  if (Math.abs(value) < 1) {
    return Math.round(value).toString();
  }
  const ten = Math.floor(Math.log10(Math.abs(value)));
  const three = Math.floor(ten / 3);
  const num = Math.round(value / Math.pow(10, three * 3));
  const suffix = ["", "K", "M", "B", "T", "Q", "P"][three] ?? "";
  return `${num} ${suffix}`.trim();
}

/**
 * Meridian's Expenses donut ramp: a single-hue pink scale, darkest first. Kept as a named
 * export so a document that supplies no per-series colors still lands on the app's palette
 * instead of an ad-hoc rainbow.
 */
export const MERIDIAN_DONUT_COLORS = ["#df9eb8", "#e9c4da", "#f2d4e6", "#f8e2f0", "#feeef8"];

/** Meridian's two-series dashboard palette (Cashflow inflow/outflow, P&L positive/negative). */
export const MERIDIAN_SERIES_COLORS = ["#33a1ff", "#df9eb8", "#59ba8b", "#f2d14b", "#9c45e3", "#36baad"];

export const MERIDIAN_CHART_GRID_COLOR = "rgba(0, 0, 0, 0.2)";
export const MERIDIAN_CHART_FONT_COLOR = "#7c7c7c";
