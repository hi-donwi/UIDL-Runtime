import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { factoryAbc } from "../companies/factoryAbc";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("factory-abc ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(factoryAbc.defaultModule).toBe("manufacturing-ops");
    expect(Object.keys(factoryAbc.pages)).toHaveLength(0);

    const paths = navGroups(factoryAbc).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/factory-abc/manufacturing-ops",
        "/app/factory-abc/list/WorkOrder",
        "/app/factory-abc/edit/WorkOrder/new",
        "/app/factory-abc/report/ManufacturingPerformance",
      ]),
    );
    expect(defaultCompanyPath(factoryAbc)).toBe("/app/factory-abc/manufacturing-ops");
    expect(legacyConsolePath(factoryAbc, "/console/factory-abc/dashboard")).toBe("/app/factory-abc/manufacturing-ops");
    expect(legacyConsolePath(factoryAbc, "/console/factory-abc/work-order")).toBe("/app/factory-abc/list/WorkOrder");
  });

  it("resolves workspace, work order list, new form, and performance report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/factory-abc/manufacturing-ops", { companies: [factoryAbc] });
    expect(workspace?.document.id).toBe("workspace-manufacturing-ops");
    expect(workspace?.title).toBe("Manufacturing Ops");

    const list = resolveConsoleModuleRoute("/app/factory-abc/list/WorkOrder?filter_status=Quality%20Check", {
      companies: [factoryAbc],
    });
    expect(list?.document.id).toBe("list-workorder");
    expect(list?.document.state?.filter_status).toBe("Quality Check");

    const form = resolveConsoleModuleRoute("/app/factory-abc/edit/WorkOrder/new", { companies: [factoryAbc] });
    expect(form?.document.id).toBe("form-workorder-new");

    const report = resolveConsoleModuleRoute("/app/factory-abc/report/ManufacturingPerformance", { companies: [factoryAbc] });
    expect(report?.document.id).toBe("report-manufacturingperformance");
  });

  it("seeds canonical WorkOrder rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.WorkOrder?.length).toBeGreaterThanOrEqual(60);
    expect(seed.WorkOrder?.[0]).toMatchObject({ id: "WO-2026-0001", companyId: "factory-abc" });
  });
});

