/**
 * Unified Reference Application Router Types.
 *
 * Implements the target routing architecture defined in 01-arsitektur-target.md §6.
 */

export type AppRouteKind =
  | "landing"
  | "workspace"
  | "list"
  | "edit"
  | "report"
  | "print"
  | "pos"
  | "settings"
  | "gallery"
  | "playground"
  | "not-found";

export interface AppRoute {
  kind: AppRouteKind;
  path: string;
  company?: string;
  module?: string;
  doctype?: string;
  id?: string;
  templateId?: string;
  reportName?: string;
  settingsSection?: string;
  galleryCategory?: string;
  queryParams?: Record<string, string>;
  rawQuery?: string;
}

export interface RouteRedirect {
  from: string | RegExp;
  to: string | ((matches: RegExpMatchArray, search: string) => string);
}
