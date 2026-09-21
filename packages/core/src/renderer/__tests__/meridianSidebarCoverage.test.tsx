import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { renderUIDocument } from "../renderDocument";
import { MERIDIAN_SIDEBAR } from "../../../../../packages/templates/src/meridian/sidebarConfig";
import { parseMeridianRoute } from "../../../../../packages/templates/src/meridian/routing";
import { getPageRegistryEntry } from "../../../../../packages/templates/src/meridian/pages";
import { getReportBuilder, buildDashboardDocument, buildChartOfAccountsDocument } from "../../../../../packages/templates/src/meridian/reports";
import { buildPosDocument } from "../../../../../packages/templates/src/meridian/pointOfSale";
import {
  buildCustomizeFormDocument,
  buildGetStartedDocument,
  buildImportWizardDocument,
  buildSettingsDocument,
  buildTemplateBuilderDocument,
  buildSetupWizardDocument,
} from "../../../../../packages/templates/src/meridian/settingsAndMeta";

/**
 * The single most important end-to-end guarantee for this whole demo: every link the real
 * sidebar exposes must resolve to a real, renderable document — not the "🚧 not implemented"
 * placeholder. This mirrors exactly how MeridianReferenceRoute.tsx picks a document per route, so a
 * mismatch here (e.g. a sidebar path the route parser or page registry doesn't recognize) is
 * caught by a single test run instead of only by manually clicking every link in a browser.
 */
function resolveDocumentForPath(path: string) {
  const route = parseMeridianRoute(path);
  if (route.kind === "list" && route.doctype) return getPageRegistryEntry(route.doctype)?.list();
  if (route.kind === "dashboard") return buildDashboardDocument();
  if (route.kind === "chart-of-accounts") return buildChartOfAccountsDocument();
  if (route.kind === "report" && route.reportName) return getReportBuilder(route.reportName)?.();
  if (route.kind === "pos") return buildPosDocument();
  if (route.kind === "settings") return buildSettingsDocument();
  if (route.kind === "get-started") return buildGetStartedDocument();
  if (route.kind === "import-wizard") return buildImportWizardDocument();
  if (route.kind === "customize-form") return buildCustomizeFormDocument();
  if (route.kind === "template-builder") return buildTemplateBuilderDocument();
  if (route.kind === "setup-wizard") return buildSetupWizardDocument();
  return undefined;
}

const allSidebarLinks: Array<[string, string, string]> = MERIDIAN_SIDEBAR.flatMap(
  (group: { label: string; items: Array<{ label: string; path: string }> }) =>
    group.items.map((item: { label: string; path: string }) => [group.label, item.label, item.path] as [string, string, string]),
);

describe("meridian demo — every real sidebar link resolves to a real document", () => {
  it("the sidebar has every group from the Meridian sidebarConfig.ts", () => {
    expect(MERIDIAN_SIDEBAR.map((group: { label: string }) => group.label)).toEqual([
      "Get Started",
      "Dashboard",
      "Sales",
      "Purchases",
      "Common",
      "Reports",
      "Inventory",
      "POS",
      "GST",
      "Setup",
    ]);
  });

  it.each(allSidebarLinks)(
    "%s > %s (%s) resolves to a document, not the not-implemented placeholder",
    (_group: string, _label: string, path: string) => {
      const doc = resolveDocumentForPath(path);
      expect(doc, `${path} has no resolver — would show the placeholder in MeridianReferenceRoute`).toBeDefined();
    },
  );

  it.each(allSidebarLinks)(
    "%s > %s (%s): the resolved document validates and renders with no console errors",
    (_group: string, _label: string, path: string) => {
      const doc = resolveDocumentForPath(path);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const parsed = DocumentSchema.parse(doc);
      render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
      expect(consoleError, path).not.toHaveBeenCalled();
      consoleError.mockRestore();
    },
  );
});

describe("meridian demo — every newRoute resolves to a valid, renderable create form document", () => {
  const doctypesWithNew = [
    "Customer",
    "Supplier",
    "Item",
    "SalesItem",
    "PurchaseItem",
    "SalesInvoice",
    "PurchaseInvoice",
    "SalesQuote",
    "SalesPayment",
    "PurchasePayment",
    "JournalEntry",
    "Lead",
    "CouponCode",
    "StockMovement",
    "AccountingDimension",
    "QualityInspection",
    "PurchaseOrder",
    "SalesOrder",
    "DeliveryNote",
    "BillOfMaterials",
    "WorkOrder",
    "JobCard",
  ];

  it.each(doctypesWithNew)("doctype %s has a valid newRoute and renders form('new') with no errors", (doctype) => {
    const entry = getPageRegistryEntry(doctype);
    expect(entry, `Entry for ${doctype} must exist`).toBeDefined();
    expect(entry?.newRoute, `newRoute for ${doctype} must exist`).toBeDefined();
    expect(entry?.newRoute).toBe(`/meridian/edit/${doctype === "SalesItem" || doctype === "PurchaseItem" ? "Item" : doctype}/new`);

    const newDoc = entry?.form("new");
    expect(newDoc, `form('new') for ${doctype} must return a valid document, not undefined`).toBeDefined();

    const parsed = DocumentSchema.parse(newDoc);
    expect(parsed.id).toContain("-new");
    expect(parsed.name).toMatch(/New /i);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
