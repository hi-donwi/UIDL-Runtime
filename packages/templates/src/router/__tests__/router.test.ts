import { describe, expect, it } from "vitest";
import { parseAppRoute, buildAppPath, resolveRouteRedirect } from "../router";
import { resolveConsoleModuleRoute } from "../../console/moduleRuntime";
import { shoeCompany } from "../../console/companies/shoeCompany";

describe("Unified Router · parseAppRoute", () => {
  it("parses landing and utility routes", () => {
    expect(parseAppRoute("/").kind).toBe("landing");
    expect(parseAppRoute("/playground").kind).toBe("playground");
    expect(parseAppRoute("/gallery/navigation").kind).toBe("gallery");
  });

  it("parses canonical /app/:company routes with list, edit, report, and query params", () => {
    const listRoute = parseAppRoute("/app/shoe-company/list/SalesInvoice?page=2&sort=-dueDate&filter_status=Paid");
    expect(listRoute.kind).toBe("list");
    expect(listRoute.company).toBe("shoe-company");
    expect(listRoute.doctype).toBe("SalesInvoice");
    expect(listRoute.queryParams?.page).toBe("2");
    expect(listRoute.queryParams?.sort).toBe("-dueDate");
    expect(listRoute.queryParams?.filter_status).toBe("Paid");

    const editRoute = parseAppRoute("/app/shoe-company/edit/SalesInvoice/SINV-001");
    expect(editRoute.kind).toBe("edit");
    expect(editRoute.company).toBe("shoe-company");
    expect(editRoute.doctype).toBe("SalesInvoice");
    expect(editRoute.id).toBe("SINV-001");

    const reportRoute = parseAppRoute("/app/factory-abc/report/GeneralLedger");
    expect(reportRoute.kind).toBe("report");
    expect(reportRoute.company).toBe("factory-abc");
    expect(reportRoute.reportName).toBe("GeneralLedger");
  });

  it("redirects and parses legacy /meridian/* routes to canonical Meridian routes", () => {
    expect(resolveRouteRedirect("/meridian/list/Customer")).toBe("/app/meridian/list/Customer");
    expect(resolveRouteRedirect("/meridian/edit/SalesInvoice/SINV-001")).toBe("/app/meridian/edit/SalesInvoice/SINV-001");
    expect(resolveRouteRedirect("/meridian/dashboard")).toBe("/app/meridian/dashboard");

    const parsedLegacy = parseAppRoute("/meridian/list/Item");
    expect(parsedLegacy.kind).toBe("list");
    expect(parsedLegacy.company).toBe("meridian");
    expect(parsedLegacy.doctype).toBe("Item");
  });

  it("parses valid legacy /console/:company/:page routes", () => {
    const consoleRoute = parseAppRoute("/console/shoe-company/pos-shift");
    expect(consoleRoute.kind).toBe("list");
    expect(consoleRoute.company).toBe("shoe-company");
    expect(consoleRoute.doctype).toBe("POSShift");
  });

  it("returns real 404 (not-found) for invalid routes without falling back silently to dashboard", () => {
    const invalidConsolePage = parseAppRoute("/console/shoe-company/ngawur");
    expect(invalidConsolePage.kind).toBe("not-found");
    expect(invalidConsolePage.path).toContain("ngawur");

    const invalidCompany = parseAppRoute("/app/perusahaan-tidak-ada/dashboard");
    expect(invalidCompany.kind).toBe("not-found");

    const invalidSubpath = parseAppRoute("/app/shoe-company/random/invalid/path");
    expect(invalidSubpath.kind).toBe("not-found");
  });

  it("resolves the bare company route and the /dashboard alias to the company's real default module, not a literal 'dashboard' module lookup", () => {
    // Regression for the 2026-08-25 demo-quality audit: no company declares a module literally
    // named "dashboard" (shoe-company's is "retail-ops"), but this branch used to hardcode
    // `module: "dashboard"` on the parsed route, which shadowed moduleRuntime's own
    // `route.module ?? company.defaultModule ?? "dashboard"` fallback — findModule() then found
    // nothing, resolveConsoleModuleRoute returned null, and ReferenceApp silently fell back to
    // rendering the unrelated 11-company catalog landing page instead of the company's dashboard.
    const bare = parseAppRoute("/app/shoe-company");
    expect(bare.kind).toBe("workspace");
    expect(bare.module).toBeUndefined();

    const dashboardAlias = parseAppRoute("/app/shoe-company/dashboard");
    expect(dashboardAlias.kind).toBe("workspace");
    expect(dashboardAlias.module).toBeUndefined();

    for (const path of ["/app/shoe-company", "/app/shoe-company/dashboard"]) {
      const resolved = resolveConsoleModuleRoute(path, { companies: [shoeCompany] });
      expect(resolved, `${path} should resolve to a real workspace, not fall through to null`).not.toBeNull();
      expect(resolved?.activePath).toBe("/app/shoe-company/retail-ops");
    }
  });
});

describe("Unified Router · buildAppPath", () => {
  it("builds canonical paths with query parameters", () => {
    expect(buildAppPath({ kind: "landing" })).toBe("/");
    expect(
      buildAppPath({
        kind: "list",
        company: "shoe-company",
        doctype: "SalesInvoice",
        queryParams: { page: "1", filter_status: "Draft" },
      }),
    ).toBe("/app/shoe-company/list/SalesInvoice?page=1&filter_status=Draft");

    expect(
      buildAppPath({
        kind: "edit",
        company: "factory-abc",
        doctype: "WorkOrder",
        id: "WO-2026-001",
      }),
    ).toBe("/app/factory-abc/edit/WorkOrder/WO-2026-001");
  });
});
