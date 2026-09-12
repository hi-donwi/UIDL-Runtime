import type { UIDLDocument } from "~/types";
import type { Language } from "~/utils/i18n";
import type { AppRoute } from "../router";
import { parseAppRoute } from "../router";
import type { DoctypeMeta } from "../domain/doctypes/types";
import {
  buildFormPage,
  buildListPage,
  buildReportPage,
  buildWorkspacePage,
  parseListQueryParams,
} from "../domain/generators";
import type { CompanyDemo, ModuleSpec } from "./types";

export interface ConsoleModuleRouteResolution {
  route: AppRoute;
  company: CompanyDemo;
  document: UIDLDocument;
  title: string;
  activePath: string;
  /**
   * True for an "edit" route on an existing record whose data hasn't been supplied via
   * `editRecord` yet. `document` is still a valid (but blank) form in this state — callers must
   * not let the user interact with Save/transition while `loading` is true, or a blank record
   * could silently overwrite the real one once the fetch does land.
   */
  loading: boolean;
}

export interface ResolveConsoleModuleRouteOptions {
  companies: CompanyDemo[];
  lang?: Language;
  /**
   * For "edit" routes on an existing record (id !== "new"): the already-fetched record to
   * pre-fill the form with. This function is otherwise fully synchronous and never fetches data
   * itself — the caller (ReferenceApp) owns the `dataAdapter.get(...)` call and passes the result
   * here once it resolves. Omit while the fetch is in flight (the resolution comes back with
   * `loading: true`); pass `null` if the record genuinely doesn't exist.
   */
  editRecord?: { record: Record<string, unknown>; version?: number } | null;
}

export function resolveConsoleModuleRoute(
  path: string,
  options: ResolveConsoleModuleRouteOptions,
): ConsoleModuleRouteResolution | null {
  const route = parseAppRoute(path);
  if (!route.company || route.kind === "not-found" || route.company === "meridian") return null;

  const company = options.companies.find((entry) => entry.id === route.company);
  if (!company) return null;

  const lang = options.lang ?? "id";

  if (route.kind === "workspace") {
    const moduleName = route.module ?? company.defaultModule ?? "dashboard";
    const module = findModule(company, moduleName);
    if (!module?.workspace) return null;

    const document = buildWorkspacePage(module.workspace, { company: company.id, lang });
    return {
      route,
      company,
      document,
      title: module.workspace.label[lang] ?? module.label[lang] ?? module.name,
      activePath: `/app/${company.id}/${module.name}`,
      loading: false,
    };
  }

  if (route.kind === "list" && route.doctype) {
    const meta = findDoctype(company, route.doctype);
    if (!meta) return null;

    const initialState = parseListQueryParams(route.rawQuery ?? "", meta);
    const document = buildListPage(meta, { company: company.id, lang, initialState });
    return {
      route,
      company,
      document,
      title: meta.label[lang] ?? meta.name,
      activePath: `/app/${company.id}/list/${meta.name}`,
      loading: false,
    };
  }

  if (route.kind === "edit" && route.doctype) {
    const meta = findDoctype(company, route.doctype);
    if (!meta) return null;

    const recordId = route.id ?? "new";
    const isNew = recordId === "new";
    // Only an existing record needs data fetched before it's safe to render; "new" never has
    // anything to wait for. `editRecord === undefined` means the caller's fetch hasn't landed
    // yet — `null` means it landed and the record genuinely doesn't exist (still not "loading").
    const loading = !isNew && options.editRecord === undefined;

    const document = buildFormPage(meta, recordId, {
      company: company.id,
      lang,
      initialData: options.editRecord?.record,
      initialVersion: options.editRecord?.version,
    });
    return {
      route,
      company,
      document,
      title: document.name,
      activePath: isNew ? `/app/${company.id}/edit/${meta.name}/new` : `/app/${company.id}/list/${meta.name}`,
      loading,
    };
  }

  if (route.kind === "report" && route.reportName) {
    const report = findReport(company, route.reportName);
    if (!report) return null;

    const document = buildReportPage(report, { company: company.id, lang });
    return {
      route,
      company,
      document,
      title: report.label[lang] ?? report.name,
      activePath: `/app/${company.id}/report/${report.name}`,
      loading: false,
    };
  }

  return null;
}

function findModule(company: CompanyDemo, moduleName: string): ModuleSpec | undefined {
  return company.modules?.find((module) => module.name === moduleName || module.workspace?.name === moduleName);
}

export function findDoctype(company: CompanyDemo, doctypeName: string): DoctypeMeta | undefined {
  return [
    ...(company.modules?.flatMap((module) => module.doctypes ?? []) ?? []),
    ...(company.doctypes ?? []),
  ].find((meta) => meta.name === doctypeName);
}

function findReport(company: CompanyDemo, reportName: string) {
  return [
    ...(company.modules?.flatMap((module) => module.reports ?? []) ?? []),
    ...(company.reports ?? []),
  ].find((report) => report.name === reportName);
}
