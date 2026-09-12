/**
 * Unified Reference Application Router.
 *
 * Implements `/app/:company/...` routing with backward-compatible redirects from
 * legacy `/meridian/*` and `/console/*` paths, real 404 detection, and URL query parameter preservation.
 */

import type { AppRoute } from "./types";
import { companies } from "../console/companies";
import { legacyConsolePath } from "../console/navigation";

/** Known standard company slugs. */
const KNOWN_COMPANIES = new Set([
  "meridian",
  ...companies.map((c) => c.id),
]);

/** Known meridian legacy routes that map directly to standard Meridian pages. */
const MERIDIAN_TO_MERIDIAN_MODULE_MAP: Record<string, string> = {
  "dashboard": "dashboard",
  "get-started": "get-started",
  "chart-of-accounts": "chart-of-accounts",
  "settings": "settings",
  "pos": "pos",
  "import-wizard": "import-wizard",
  "customize-form": "customize-form",
  "template-builder": "template-builder",
};

/**
 * Checks whether a legacy path has a canonical redirect destination.
 */
export function resolveRouteRedirect(fullPath: string): string | null {
  const [pathname, search = ""] = fullPath.split("?");
  const querySuffix = search ? `?${search}` : "";

  // 1. /meridian/* -> /app/meridian/*
  if (pathname.startsWith("/meridian")) {
    const sub = pathname.replace(/^\/meridian\/?/, "");
    if (!sub || sub === "dashboard") {
      return `/app/meridian/dashboard${querySuffix}`;
    }
    if (sub.startsWith("list/")) {
      const doctype = sub.replace(/^list\//, "");
      return `/app/meridian/list/${doctype}${querySuffix}`;
    }
    if (sub.startsWith("edit/")) {
      const parts = sub.replace(/^edit\//, "").split("/");
      const doctype = parts[0];
      const id = parts[1] ?? "new";
      return `/app/meridian/edit/${doctype}/${id}${querySuffix}`;
    }
    if (sub.startsWith("report/")) {
      const report = sub.replace(/^report\//, "");
      return `/app/meridian/report/${report}${querySuffix}`;
    }
    if (sub.startsWith("print/")) {
      const parts = sub.replace(/^print\//, "").split("/");
      // /meridian/print/:templateId/:doctype/:id -> /app/meridian/print/:templateId/:doctype/:id
      return `/app/meridian/print/${parts.join("/")}${querySuffix}`;
    }
    if (sub === "pos") {
      return `/app/meridian/pos${querySuffix}`;
    }
    if (sub === "settings") {
      return `/app/meridian/settings${querySuffix}`;
    }
    if (MERIDIAN_TO_MERIDIAN_MODULE_MAP[sub]) {
      return `/app/meridian/${sub}${querySuffix}`;
    }
    return `/app/meridian/${sub}${querySuffix}`;
  }

  // 2. /console/:companyId/* -> /app/:companyId/*
  if (pathname.startsWith("/console/")) {
    const parts = pathname.replace(/^\/console\//, "").split("/").filter(Boolean);
    const companyId = parts[0];

    if (companyId) {
      const company = companies.find((entry) => entry.id === companyId);
      if (company) {
        const canonicalPath = legacyConsolePath(company, pathname);
        return canonicalPath === pathname ? null : `${canonicalPath}${querySuffix}`;
      }
      return `/app/${companyId}/dashboard${querySuffix}`;
    }
  }

  return null;
}

/**
 * Parses any incoming URL path (and optional query string) into a structured `AppRoute`.
 */
export function parseAppRoute(
  fullPath: string,
  extraSearchParams?: URLSearchParams | string,
): AppRoute {
  const [pathnameWithSlash, inlineQuery = ""] = fullPath.split("?");
  const pathname = pathnameWithSlash.replace(/\/+$/, "") || "/";

  // Parse query params
  const searchParams = new URLSearchParams(
    extraSearchParams
      ? typeof extraSearchParams === "string"
        ? extraSearchParams
        : extraSearchParams.toString()
      : inlineQuery,
  );

  const queryParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  const rawQuery = searchParams.toString();

  // 1. Landing root
  if (pathname === "" || pathname === "/") {
    return { kind: "landing", path: "/", queryParams, rawQuery };
  }

  // 2. Playground
  if (pathname === "/playground") {
    return { kind: "playground", path: "/playground", queryParams, rawQuery };
  }

  // 3. Component Gallery
  if (pathname.startsWith("/gallery")) {
    const category = pathname.replace(/^\/gallery\/?/, "") || "primitives";
    return {
      kind: "gallery",
      path: pathname,
      galleryCategory: category,
      queryParams,
      rawQuery,
    };
  }

  // 4. Canonical /app/:company/... routes
  if (pathname.startsWith("/app/")) {
    const segments = pathname.replace(/^\/app\//, "").split("/").filter(Boolean);
    const company = segments[0];

    // Verify company existence
    const isKnownCompany = KNOWN_COMPANIES.has(company);
    if (!isKnownCompany) {
      return { kind: "not-found", path: fullPath, queryParams, rawQuery };
    }

    const rest = segments.slice(1);

    // /app/:company and /app/:company/dashboard both mean "this company's home workspace" —
    // leave `module` unset so moduleRuntime's `route.module ?? company.defaultModule ?? "dashboard"`
    // fallback picks the company's real default module. No company declares a module literally
    // named "dashboard", so setting it here made resolveConsoleModuleRoute fail to find a module
    // and return null, silently falling back to the unrelated 11-company catalog landing page.
    if (rest.length === 0 || rest[0] === "dashboard") {
      return {
        kind: "workspace",
        path: pathname,
        company,
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/list/:doctype
    if (rest[0] === "list" && rest[1]) {
      return {
        kind: "list",
        path: pathname,
        company,
        doctype: rest[1],
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/edit/:doctype/:id
    if (rest[0] === "edit" && rest[1]) {
      return {
        kind: "edit",
        path: pathname,
        company,
        doctype: rest[1],
        id: rest[2] ?? "new",
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/report/:reportName
    if (rest[0] === "report" && rest[1]) {
      return {
        kind: "report",
        path: pathname,
        company,
        reportName: rest[1],
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/print/:templateId/:doctype/:id
    if (rest[0] === "print" && rest[1] && rest[2] && rest[3]) {
      return {
        kind: "print",
        path: pathname,
        company,
        templateId: rest[1],
        doctype: rest[2],
        id: rest[3],
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/pos
    if (rest[0] === "pos") {
      return {
        kind: "pos",
        path: pathname,
        company,
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/settings/:section?
    if (rest[0] === "settings") {
      return {
        kind: "settings",
        path: pathname,
        company,
        settingsSection: rest[1],
        queryParams,
        rawQuery,
      };
    }

    // /app/:company/:module (workspace)
    if (rest.length === 1) {
      const moduleName = rest[0];
      const companyObj = companies.find((c) => c.id === company);
      const hasWorkspace =
        companyObj &&
        (
          companyObj.pages[moduleName] ||
          companyObj.defaultModule === moduleName ||
          companyObj.modules?.some((module) => module.name === moduleName || module.workspace?.name === moduleName)
        );
      if (company === "meridian" || hasWorkspace) {
        return {
          kind: "workspace",
          path: pathname,
          company,
          module: moduleName,
          queryParams,
          rawQuery,
        };
      }
    }

    // Unrecognized /app/:company subpath -> not-found
    return { kind: "not-found", path: fullPath, queryParams, rawQuery };
  }

  // 5. Legacy /meridian/... handling
  if (pathname.startsWith("/meridian")) {
    const redirect = resolveRouteRedirect(fullPath);
    if (redirect) {
      return parseAppRoute(redirect);
    }
  }

  // 6. Legacy /console/... handling
  if (pathname.startsWith("/console/")) {
    const redirect = resolveRouteRedirect(fullPath);
    if (redirect) return parseAppRoute(redirect);

    const parts = pathname.replace(/^\/console\//, "").split("/").filter(Boolean);
    const companyId = parts[0];
    const pageId = parts[1] ?? "dashboard";
    const company = companies.find((c) => c.id === companyId);
    if (!company) return { kind: "not-found", path: fullPath, queryParams, rawQuery };

    if (company.pages[pageId]) {
      return {
        kind: "workspace",
        path: pathname,
        company: companyId,
        module: pageId,
        queryParams,
        rawQuery,
      };
    }

    return { kind: "not-found", path: fullPath, queryParams, rawQuery };
  }

  // Anything else -> not-found
  return { kind: "not-found", path: fullPath, queryParams, rawQuery };
}

/**
 * Builds a canonical pathname string from an `AppRoute` or route options.
 */
export function buildAppPath(route: Partial<AppRoute>): string {
  if (route.kind === "landing") return "/";
  if (route.kind === "playground") return "/playground";
  if (route.kind === "gallery") return `/gallery/${route.galleryCategory ?? "primitives"}`;

  const company = route.company ?? "meridian";

  let basePath = `/app/${company}`;

  switch (route.kind) {
    case "workspace":
      basePath = `/app/${company}/${route.module ?? "dashboard"}`;
      break;
    case "list":
      basePath = `/app/${company}/list/${route.doctype}`;
      break;
    case "edit":
      basePath = `/app/${company}/edit/${route.doctype}/${route.id ?? "new"}`;
      break;
    case "report":
      basePath = `/app/${company}/report/${route.reportName}`;
      break;
    case "print":
      basePath = `/app/${company}/print/${route.templateId}/${route.doctype}/${route.id}`;
      break;
    case "pos":
      basePath = `/app/${company}/pos`;
      break;
    case "settings":
      basePath = `/app/${company}/settings${route.settingsSection ? `/${route.settingsSection}` : ""}`;
      break;
    default:
      if (route.path) return route.path;
      break;
  }

  if (route.queryParams && Object.keys(route.queryParams).length > 0) {
    const sp = new URLSearchParams(route.queryParams);
    return `${basePath}?${sp.toString()}`;
  }

  return basePath;
}
