/**
 * Unified Console Metadata & Module Specifications.
 *
 * Defines the target `ModuleSpec` and `CompanyConsoleMeta` architecture
 * replacing static `PageSpec` with declarative `DoctypeMeta`, `WorkspaceSpec`, and `ReportSpec`.
 */

import type { DoctypeMeta } from "../domain/doctypes/types";
import type { WorkspaceSpec } from "../domain/generators/buildWorkspacePage";
import type { ReportSpec } from "../domain/generators/buildReportPage";

export type CompanyCategory =
  | "Dagang & Ritel"
  | "Manufaktur"
  | "Kesehatan & Medtech"
  | "Jasa, CRM & Koperasi";

export type PageAlign = "left" | "right" | "center";

export interface TableColumn {
  key: string;
  label: string;
  align?: PageAlign;
}

export interface TableSpec {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: TableColumn[];
  rowActions?: Array<{ label: string }>;
}

export interface PageSpec {
  title: string;
  module: string;
  actions: string[];
  kpis: Array<[string, string]>;
  chartTitle: string;
  chartType: "bar" | "line" | "donut";
  chartRows: Array<{ label: string; value: number }>;
  tables: TableSpec[];
}

export interface ConsoleNavItem {
  label: string;
  page: string;
  path?: string;
  iconName?: string;
  doctype?: string;
  report?: string;
  module?: string;
}

export interface ConsoleNavGroup {
  label: string;
  items: ConsoleNavItem[];
}

export interface ModuleSpec {
  name: string;
  label: { id: string; en: string };
  iconName?: string;
  workspace?: WorkspaceSpec;
  doctypes?: DoctypeMeta[];
  reports?: ReportSpec[];
}

export interface CompanyConsoleMeta {
  id: string;
  company: string;
  title: string;
  subtitle: string;
  source: string;
  patterns: string[];
  category?: CompanyCategory;
  modules?: ModuleSpec[];
  doctypes?: DoctypeMeta[];
  reports?: ReportSpec[];
  defaultModule?: string;
  nav: ConsoleNavGroup[];
  pages: Record<string, PageSpec>;
}

export type CompanyReference = CompanyConsoleMeta;
/** @deprecated Use `CompanyReference`. Kept as an advisory compatibility alias. */
export type CompanyDemo = CompanyReference;

export function page(
  title: string,
  module: string,
  actions: string[],
  kpis: Array<[string, string]>,
  chartTitle: string,
  chartType: "bar" | "line" | "donut",
  chartRows: Array<{ label: string; value: number }>,
  tables: TableSpec[],
): PageSpec {
  return { title, module, actions, kpis, chartTitle, chartType, chartRows, tables };
}

/** Chart rows from `[label, value]` pairs. */
export function splitRows(rows: Array<[string, number]>): Array<{ label: string; value: number }> {
  return rows.map(([label, value]) => ({ label, value }));
}

/** A four-week trend, the shape Meridian's dashboard chart expects. */
export function moneyTrend(values: number[]): Array<{ label: string; value: number }> {
  return values.map((value, index) => ({ label: `W${index + 1}`, value }));
}

export function table(
  title: string,
  columns: Array<[string, string, PageAlign?]>,
  rows: Array<Record<string, unknown>>,
  rowActions?: string[],
): TableSpec {
  return {
    title,
    columns: columns.map(([key, label, align]) => (align ? { key, label, align } : { key, label })),
    rows,
    rowActions: rowActions?.map((label) => ({ label })),
  };
}
