/**
 * Public recipe / compiler contracts — free of demo, company, and host-specific code.
 *
 * This is the *specification* layer. It defines the
 * vocabulary a host (the reference app, the tests) and a compiler share
 * without either side importing the other's domain data, demo datasets,
 * company fixtures, or tenant credentials.
 *
 * Why this file exists:
 * - `packages/templates/src/domain` holds *one* concrete meta shape
 *   (DoctypeMeta) bound to the uidl-runtime reference datasets. It is the
 *   *consumer* of this contract, not the contract itself.
 * - host's `ErpModuleSpec` is a *different* concrete meta shape bound to
 *   capability packs. It will be *mapped* to this contract, not
 *   imported here.
 * - A public compiler must not know about `ShoeCompany`, `Meridian`,
 *   `ErpModuleSpec`, `module.records`, or any tenant id. Host policy and
 *   route decisions travel in `HostCapabilities` / `RoutePolicy` / `UiPolicy`
 *   instead.
 *
 * Dependency rule: this file may only import from `../types` (UIDL) and
 * `../utils/i18n` (Language). It MUST NOT import from
 * `../../templates/**`, `@host-app/**`, or any demo / company fixture.
 */

import type { UIDLDocument } from "../types";
import type { Language } from "../utils/i18n";
import type { CellFormat } from "../utils/listCell";

// ---------------------------------------------------------------------------
// Recipe identity
// ---------------------------------------------------------------------------

/** Seven recipes the public compiler must support */
export type PageRecipe =
  | "list"
  | "form"
  | "report"
  | "dashboard"
  | "settings"
  | "tree"
  | "wizard";

export const PAGE_RECIPES: readonly PageRecipe[] = [
  "list",
  "form",
  "report",
  "dashboard",
  "settings",
  "tree",
  "wizard",
] as const;

export function isPageRecipe(value: unknown): value is PageRecipe {
  return typeof value === "string" && (PAGE_RECIPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Shared primitives — intentionally small, tenant-free
// ---------------------------------------------------------------------------

export type LocalizedText = { id: string; en: string };

export type FieldWidget =
  | "TextField"
  | "Textarea"
  | "Select"
  | "RadioGroup"
  | "Checkbox"
  | "Switch"
  | "Slider"
  | "Link"
  | "Currency"
  | "Date"
  | "Table";

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * A Link field's lookup target. `valueKey`/`labelKey` say how a row of that doctype becomes an
 * option — the rows come from the host's query and carry the target's own keys, not
 * `value`/`label`, so without them a Link rendered as an empty select.
 */
export interface LinkTarget {
  doctype: string;
  valueKey?: string;
  labelKey?: string;
}

export interface FieldMeta {
  key: string;
  label: LocalizedText;
  widget: FieldWidget;
  /**
   * How the value is *printed*, when that differs from what the widget implies. Meridian keeps
   * the two apart: a Float and a Currency both edit as a number box, but only Currency prints
   * with a symbol — so a "Rate %" mapped to the Currency widget rendered as `IDR 2`.
   * Unset, the list recipe infers the format from `widget`.
   */
  format?: CellFormat;
  required?: boolean;
  readOnly?: boolean;
  options?: FieldOption[] | LinkTarget;
  placeholder?: string | LocalizedText;
  default?: unknown;
  section?: string;
}

// ---------------------------------------------------------------------------
// Per-recipe meta — generic, company-agnostic
// ---------------------------------------------------------------------------

export interface ListColumn {
  field: string;
  width?: string;
  align?: "left" | "right" | "center";
}

export interface ListFilter {
  field: string;
  widget: "Select" | "TextField" | "DateRange";
  label?: LocalizedText;
  options?: FieldOption[];
}

export interface ListSummary {
  label: LocalizedText;
  agg: "sum" | "count" | "avg";
  field: string;
}

export interface ListPageMeta {
  name: string;
  label: LocalizedText;
  titleField: string;
  fields: FieldMeta[];
  columns: ListColumn[];
  filters?: ListFilter[];
  defaultSort: { field: string; dir: "asc" | "desc" };
  pageSize?: number;
  statusField?: string;
  summaries?: ListSummary[];
}

export interface StateTransition {
  name: string;
  label: LocalizedText;
  from: string[];
  to: string;
  confirm?: LocalizedText;
}

export interface DocumentStates {
  field: string;
  values: string[];
  initial: string;
  transitions: StateTransition[];
}

export interface ChildTableRef {
  field: string;
  doctype: string;
}

export interface FormPageMeta {
  name: string;
  label: LocalizedText;
  titleField: string;
  fields: FieldMeta[];
  states?: DocumentStates;
  childTables?: ChildTableRef[];
}

export interface ReportColumn {
  key: string;
  label: LocalizedText | string;
  align?: "left" | "right" | "center";
  width?: string;
  /**
   * How the value is printed — the same ListCell rule a list column follows. A report's
   * money column is money: without this a General Ledger printed `1500000` beside a reference
   * that shows `Rp 1.500.000`.
   */
  format?: CellFormat;
}

export interface ReportFilter {
  field: string;
  label: LocalizedText;
  widget: "Select" | "TextField" | "DateRange";
  options?: FieldOption[];
  default?: unknown;
}

export interface ReportPageMeta {
  name: string;
  label: LocalizedText;
  columns: ReportColumn[];
  dataSource: string | Array<Record<string, unknown>> | { $query: unknown };
  filters?: ReportFilter[];
  /**
   * A headline figure. Give it `agg`/`field` to compute it from the rows the report loaded —
   * a literal `value` is only for a figure the host already knows, and a report that declared
   * `value: 0` printed a hard zero next to rows that plainly summed to more.
   */
  summaries?: Array<{ label: LocalizedText; value?: string | number; agg?: "sum" | "count" | "avg"; field?: string; format?: CellFormat }>;
}

export interface DashboardKpi {
  label: LocalizedText;
  value: string | number;
}

export interface DashboardChart {
  id: string;
  title: LocalizedText;
  type: "bar" | "line" | "donut";
  xKey: string;
  yKey: string;
  dataSource: string | Array<Record<string, unknown>>;
  style?: Record<string, unknown>;
}

export interface DashboardShortcut {
  doctype: string;
  label: LocalizedText;
  description?: LocalizedText;
  route?: string;
}

export interface DashboardPageMeta {
  name: string;
  label: LocalizedText;
  kpis?: DashboardKpi[];
  charts?: DashboardChart[];
  shortcuts?: DashboardShortcut[];
  dataSources?: Record<string, unknown>;
}

export interface SettingsField extends FieldMeta {
  group?: string;
}

export interface SettingsSection {
  id: string;
  label: LocalizedText;
  fields: SettingsField[];
}

export interface SettingsPageMeta {
  name: string;
  label: LocalizedText;
  sections: SettingsSection[];
}

export interface TreeNode {
  key: string;
  label: LocalizedText;
  children?: TreeNode[];
}

export interface TreePageMeta {
  name: string;
  label: LocalizedText;
  titleField: string;
  fields: FieldMeta[];
  nodes: TreeNode[];
  parentField?: string;
}

export interface WizardStep {
  id: string;
  label: LocalizedText;
  fields: FieldMeta[];
}

export interface WizardPageMeta {
  name: string;
  label: LocalizedText;
  steps: WizardStep[];
}

export type RecipeMetaMap = {
  list: ListPageMeta;
  form: FormPageMeta;
  report: ReportPageMeta;
  dashboard: DashboardPageMeta;
  settings: SettingsPageMeta;
  tree: TreePageMeta;
  wizard: WizardPageMeta;
};

// ---------------------------------------------------------------------------
// Host & policy — what a host injects, not what a document invents
// ---------------------------------------------------------------------------

export interface QueryCapability {
  collection: string;
  filterFields?: string[];
  sortableFields?: string[];
}

export interface MutationCapability {
  collection: string;
  operations: Array<"create" | "update" | "delete" | "transition">;
  transitions?: string[];
}

/**
 * Host-owned allowlist. The compiler MUST NOT emit a `$query` collection,
 * `mutate` collection, or `command` name that is not in this manifest.
 * Unknown values fail closed (validation error, not silent render).
 */
export interface HostCapabilities {
  /** Allowed `$query.collection` values (e.g. "invoices", "customers"). */
  collections: string[];
  /** Allowed `command` names (e.g. "workspace.rag.search"). */
  commands: string[];
  /** Allowed `mutate.collection` values — if omitted, same as `collections`. */
  mutationCollections?: string[];
  /** Allowed state transition names across all doctypes (optional strict gate). */
  transitions?: string[];
  /** Per-collection query allowlist — if provided, compiler validates filter/sort fields. */
  queries?: QueryCapability[];
  /** Per-collection mutation allowlist — if provided, compiler validates operations. */
  mutations?: MutationCapability[];
  /** Optional hard caps the compiler must respect. */
  limits?: {
    maxPageSize?: number;
    maxFilters?: number;
  };
}

export interface UiPolicy {
  lang?: Language;
  density?: "compact" | "comfortable";
  theme?: string;
  /**
   * ISO 4217 code for money columns/fields. Meridian formats currency with the company's own
   * currency; a host that has one declares it here. Left unset, money prints as a grouped
   * number with no symbol rather than guessing one.
   */
  currency?: string;
}

export interface RoutePolicy {
  /** Base for list pages, e.g. "/app/acme/list". */
  listBase?: string;
  /** Base for form/edit pages, e.g. "/app/acme/edit". */
  formBase?: string;
  /** Base for report pages, e.g. "/app/acme/report". */
  reportBase?: string;
  /** Optional custom resolver — if provided, compiler must call it instead of default join. */
  resolveListRoute?: (meta: { name: string }) => string;
  resolveFormRoute?: (meta: { name: string }, id: string) => string;
  resolveReportRoute?: (meta: { name: string }) => string;
}

export interface ResponsivePolicy {
  breakpoints?: { sm?: number; md?: number; lg?: number; xl?: number };
}

// ---------------------------------------------------------------------------
// Compiler input / output
// ---------------------------------------------------------------------------

export type CompilePageInputFor<R extends PageRecipe> = {
  recipe: R;
  meta: RecipeMetaMap[R];
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  responsivePolicy?: ResponsivePolicy;
};

export type CompilePageInput =
  | CompilePageInputFor<"list">
  | CompilePageInputFor<"form">
  | CompilePageInputFor<"report">
  | CompilePageInputFor<"dashboard">
  | CompilePageInputFor<"settings">
  | CompilePageInputFor<"tree">
  | CompilePageInputFor<"wizard">;

export type CompilePageResult = UIDLDocument;

export interface PageCompiler {
  /** Deterministic, pure: same input → byte-identical UIDLDocument. */
  compilePage(input: CompilePageInput): CompilePageResult;
}

// ---------------------------------------------------------------------------
// Validation helpers — host-capability gate (fail-closed)
// ---------------------------------------------------------------------------

export type CapabilityIssue = {
  code: "unknown_collection" | "unknown_command" | "unknown_transition" | "limit_exceeded";
  message: string;
  path: string;
};

export function validateHostCapabilities(
  input: CompilePageInput,
): CapabilityIssue[] {
  const issues: CapabilityIssue[] = [];
  const caps = input.hostCapabilities;

  // Validate collections referenced by the meta are allowlisted.
  // List recipe: its `meta.name` will become the $query collection.
  // Report recipe: if dataSource is a $query, its collection must be allowlisted.
  const collections = new Set(caps.collections);
  const mutationCollections = new Set(caps.mutationCollections ?? caps.collections);

  if (input.recipe === "list" || input.recipe === "form") {
    const name = (input.meta as ListPageMeta | FormPageMeta).name;
    if (!collections.has(name) && !mutationCollections.has(name)) {
      issues.push({
        code: "unknown_collection",
        path: "meta.name",
        message: `collection "${name}" is not in hostCapabilities.collections`,
      });
    }
  }

  if (input.recipe === "report") {
    const reportMeta = input.meta as ReportPageMeta;
    const ds = reportMeta.dataSource as unknown;
    if (ds && typeof ds === "object" && "$query" in (ds as Record<string, unknown>)) {
      const coll = ((ds as { $query: { collection?: unknown } }).$query.collection as string) ?? "";
      if (coll && !collections.has(coll)) {
        issues.push({
          code: "unknown_collection",
          path: "meta.dataSource.$query.collection",
          message: `report collection "${coll}" is not in hostCapabilities.collections`,
        });
      }
    }
  }

  if (caps.limits?.maxPageSize !== undefined && input.recipe === "list") {
    const pageSize = (input.meta as ListPageMeta).pageSize ?? 20;
    if (pageSize > caps.limits.maxPageSize) {
      issues.push({
        code: "limit_exceeded",
        path: "meta.pageSize",
        message: `pageSize ${pageSize} exceeds hostCapabilities.limits.maxPageSize ${caps.limits.maxPageSize}`,
      });
    }
  }

  if (caps.limits?.maxFilters !== undefined && input.recipe === "list") {
    const count = (input.meta as ListPageMeta).filters?.length ?? 0;
    if (count > caps.limits.maxFilters) {
      issues.push({
        code: "limit_exceeded",
        path: "meta.filters",
        message: `filters count ${count} exceeds hostCapabilities.limits.maxFilters ${caps.limits.maxFilters}`,
      });
    }
  }

  // if queries allowlist is provided, validate filter/sort fields per collection
  if (caps.queries && input.recipe === "list") {
    const meta = input.meta as ListPageMeta;
    const q = caps.queries.find((qq) => qq.collection === meta.name);
    if (q) {
      for (const filter of meta.filters ?? []) {
        if (q.filterFields && !q.filterFields.includes(filter.field)) {
          issues.push({
            code: "unknown_collection",
            path: `meta.filters.${filter.field}`,
            message: `filter field "${filter.field}" not allowlisted for collection "${meta.name}" in hostCapabilities.queries`,
          });
        }
      }
      if (q.sortableFields && !q.sortableFields.includes(meta.defaultSort.field)) {
        issues.push({
          code: "unknown_collection",
          path: "meta.defaultSort.field",
          message: `sort field "${meta.defaultSort.field}" not allowlisted for collection "${meta.name}"`,
        });
      }
    }
  }

  if (caps.queries && input.recipe === "report") {
    const reportMeta = input.meta as ReportPageMeta;
    const ds = reportMeta.dataSource as unknown;
    if (ds && typeof ds === "object" && "$query" in (ds as Record<string, unknown>)) {
      const coll = ((ds as { $query: { collection?: unknown } }).$query.collection as string) ?? "";
      const q = caps.queries.find((qq) => qq.collection === coll);
      if (q && reportMeta.filters) {
        for (const filter of reportMeta.filters) {
          if (q.filterFields && !q.filterFields.includes(filter.field)) {
            issues.push({
              code: "unknown_collection",
              path: `meta.filters.${filter.field}`,
              message: `report filter field "${filter.field}" not allowlisted for collection "${coll}"`,
            });
          }
        }
      }
    }
  }

  // Link target collections must be allowlisted (scoped lookup)
  if (input.recipe === "form" || input.recipe === "settings" || input.recipe === "wizard") {
    const fields =
      input.recipe === "form"
        ? (input.meta as FormPageMeta).fields
        : input.recipe === "settings"
          ? (input.meta as SettingsPageMeta).sections.flatMap((s) => s.fields)
          : (input.meta as WizardPageMeta).steps.flatMap((s) => s.fields);
    for (const field of fields as Array<{ widget: string; key: string; options?: unknown; label: unknown }>) {
      if (field.widget === "Link") {
        const linkDoctype =
          field.options && typeof field.options === "object" && "doctype" in (field.options as Record<string, unknown>)
            ? (field.options as { doctype: string }).doctype
            : (field as unknown as { linkDoctype?: string }).linkDoctype;
        if (linkDoctype && !collections.has(linkDoctype)) {
          issues.push({
            code: "unknown_collection",
            path: `meta.fields.${field.key}.linkDoctype`,
            message: `Link target collection "${linkDoctype}" for field "${field.key}" not in hostCapabilities.collections`,
          });
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Semantic ID — stable across recompiles
// ---------------------------------------------------------------------------

/**
 * Deterministic node id for a field/control derived only from recipe + meta
 * identity, not from file paths or array order. Unchanged fields keep the
 * same id after a patch, so incremental UIDL patching can preserve
 * state and focus.
 */
export function semanticNodeId(
  recipe: PageRecipe,
  metaName: string,
  fieldKey: string,
): string {
  return `${recipe}-${metaName}-field-${fieldKey}`;
}

export function semanticListNodeIds(metaName: string) {
  return {
    search: `list-${metaName}-search`,
    table: `list-${metaName}-table`,
    page: `list-${metaName}-page`,
  } as const;
}
