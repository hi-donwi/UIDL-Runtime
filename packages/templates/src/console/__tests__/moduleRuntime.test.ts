import { describe, expect, it } from "vitest";
import { parseAppRoute } from "../../router";
import { shoeCompany } from "../companies/shoeCompany";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("shoe-company ModuleSpec runtime", () => {
  it("declares the active retail module as the canonical menu surface", () => {
    expect(shoeCompany.defaultModule).toBe("retail-ops");
    expect(Object.keys(shoeCompany.pages)).toHaveLength(0);

    const module = shoeCompany.modules?.find((entry) => entry.name === "retail-ops");
    expect(module?.workspace?.name).toBe("retail-ops");
    expect(module?.doctypes?.map((meta) => meta.name)).toContain("ShoeOrder");
    expect(module?.reports?.map((report) => report.name)).toContain("ShoeSalesSummary");

    const paths = navGroups(shoeCompany).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(expect.arrayContaining([
      "/app/shoe-company/retail-ops",
      "/app/shoe-company/list/ShoeOrder",
      "/app/shoe-company/edit/ShoeOrder/new",
      "/app/shoe-company/report/ShoeSalesSummary",
    ]));
    expect(paths.every((path) => path.startsWith("/app/shoe-company"))).toBe(true);
    expect(defaultCompanyPath(shoeCompany)).toBe("/app/shoe-company/retail-ops");
    expect(legacyConsolePath(shoeCompany, "/console/shoe-company/dashboard")).toBe("/app/shoe-company/retail-ops");
    expect(legacyConsolePath(shoeCompany, "/console/shoe-company/pos-shift")).toBe("/app/shoe-company/list/POSShift");
    expect(legacyConsolePath(shoeCompany, "/console/shoe-company/sales-analytics")).toBe(
      "/app/shoe-company/report/ShoeSalesSummary",
    );
  });

  it("routes canonical module paths by ModuleSpec name, not legacy PageSpec keys", () => {
    const route = parseAppRoute("/app/shoe-company/retail-ops");

    expect(route.kind).toBe("workspace");
    expect(route.company).toBe("shoe-company");
    expect(route.module).toBe("retail-ops");
  });

  it("resolves workspace, list, new form, and report documents from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/shoe-company/retail-ops", { companies: [shoeCompany] });
    expect(workspace?.document.id).toBe("workspace-retail-ops");
    expect(workspace?.title).toBe("Operasi Retail Sepatu");
    expect(workspace?.activePath).toBe("/app/shoe-company/retail-ops");

    const list = resolveConsoleModuleRoute("/app/shoe-company/list/ShoeOrder?filter_status=Draft", { companies: [shoeCompany] });
    expect(list?.document.id).toBe("list-shoeorder");
    expect(list?.document.state?.filter_status).toBe("Draft");
    expect(list?.title).toBe("Pesanan Sepatu");

    const form = resolveConsoleModuleRoute("/app/shoe-company/edit/ShoeOrder/new", { companies: [shoeCompany] });
    expect(form?.document.id).toBe("form-shoeorder-new");
    expect(form?.title).toBe("Buat Pesanan Sepatu");

    const report = resolveConsoleModuleRoute("/app/shoe-company/report/ShoeSalesSummary", { companies: [shoeCompany] });
    expect(report?.document.id).toBe("report-shoesalessummary");
    expect(report?.title).toBe("Ringkasan Penjualan Sepatu");
  });

  it("marks an existing-record edit route as loading until the caller supplies editRecord", () => {
    // Regression for the systemic bug the 2026-08-25 demo-quality audit found across all 11
    // verticals: moduleRuntime never fetched the record being edited, so every edit form
    // rendered blank and every Save/transition failed with a "mutate.id" error. The fetch is the
    // caller's (ReferenceApp's) job — this only proves the resolution honestly reports whether it has
    // real data yet, and never silently renders a blank form as if it were the real record.
    const notYetFetched = resolveConsoleModuleRoute("/app/shoe-company/edit/ShoeOrder/ORD-SHOE-0001", {
      companies: [shoeCompany],
    });
    expect(notYetFetched?.loading).toBe(true);
    expect(notYetFetched?.document.state?.id).toBe("ORD-SHOE-0001");
    expect(notYetFetched?.document.state?.customerName).toBe("");

    const fetched = resolveConsoleModuleRoute("/app/shoe-company/edit/ShoeOrder/ORD-SHOE-0001", {
      companies: [shoeCompany],
      editRecord: { record: { id: "ORD-SHOE-0001", customerName: "PT Contoh Sepatu" }, version: 3 },
    });
    expect(fetched?.loading).toBe(false);
    expect(fetched?.document.state?.id).toBe("ORD-SHOE-0001");
    expect(fetched?.document.state?.customerName).toBe("PT Contoh Sepatu");
    expect(fetched?.document.state?._meta).toEqual({ version: 3 });

    const newRecord = resolveConsoleModuleRoute("/app/shoe-company/edit/ShoeOrder/new", { companies: [shoeCompany] });
    expect(newRecord?.loading).toBe(false);
  });
});
