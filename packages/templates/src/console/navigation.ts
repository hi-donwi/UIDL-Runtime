/**
 * Console routing and menu wiring.
 *
 * Legacy console routes are `/console/<company>/<page>`, where `<page>` is a key in the
 * company's own `pages` map. R2 modules can override menu paths with canonical `/app/...`
 * routes while static PageSpec pages remain available as fallback bookmarks.
 */
import type { ShellNavGroup } from "../MeridianShell";
import type { CompanyDemo, ConsoleNavItem } from "./types";
import { companies } from "./companies";

export function companyPath(companyId: string, pageId: string) {
  return `/console/${companyId}/${pageId}`;
}

/** The company's declared menu, resolved to real routes. */
export function navGroups(company: CompanyDemo): ShellNavGroup[] {
  return company.nav.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      label: item.label,
      path: navItemPath(company, item),
    })),
  }));
}

export function defaultCompanyPath(company: CompanyDemo): string {
  return company.nav[0]?.items[0] ? navItemPath(company, company.nav[0].items[0]) : companyPath(company.id, "dashboard");
}

export function legacyConsolePath(company: CompanyDemo, path: string): string {
  const [pathname] = path.split("?");
  const [, segment, companyId, pageId = "dashboard"] = pathname.split("/");
  if (segment !== "console" || companyId !== company.id) return defaultCompanyPath(company);

  const navItem = company.nav.flatMap((group) => group.items).find((item) => item.page === pageId);
  if (navItem) return navItemPath(company, navItem);
  if (company.pages[pageId]) return companyPath(company.id, pageId);
  if (pageId === "dashboard") return defaultCompanyPath(company);
  return `/app/${company.id}/${pageId}`;
}

/** Every page key a company's menu can reach, in menu order. */
export function navPageIds(company: CompanyDemo): string[] {
  return company.nav.flatMap((group) => group.items.map((item) => item.page));
}

export function parseRoute(path: string): { companyId?: string; pageId?: string } {
  const [, consoleSegment, companyId, pageId] = path.split("/");
  if (consoleSegment !== "console") return {};
  const company = companies.find((entry) => entry.id === companyId);
  if (!company) return {};
  // An unknown or missing page falls back to the dashboard rather than 404-ing, so an old
  // bookmark to a page that has since been renamed still lands somewhere useful.
  const validPageId = pageId && company.pages[pageId] ? pageId : "dashboard";
  return { companyId, pageId: validPageId };
}

export function navItemPath(company: CompanyDemo, item: ConsoleNavItem): string {
  if (item.path) return item.path;
  if (item.doctype) return `/app/${company.id}/list/${item.doctype}`;
  if (item.report) return `/app/${company.id}/report/${item.report}`;
  if (item.module) return `/app/${company.id}/${item.module}`;
  return companyPath(company.id, item.page);
}
