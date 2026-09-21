import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { omnichannelDist } from "../companies/omnichannelDist";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("omnichannel-dist ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(omnichannelDist.defaultModule).toBe("fulfillment-ops");
    expect(Object.keys(omnichannelDist.pages)).toHaveLength(0);

    const paths = navGroups(omnichannelDist).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/omnichannel-dist/fulfillment-ops",
        "/app/omnichannel-dist/list/FulfillmentOrder",
        "/app/omnichannel-dist/edit/FulfillmentOrder/new",
        "/app/omnichannel-dist/report/FulfillmentPerformance",
      ]),
    );
    expect(defaultCompanyPath(omnichannelDist)).toBe("/app/omnichannel-dist/fulfillment-ops");
    expect(legacyConsolePath(omnichannelDist, "/console/omnichannel-dist/dashboard")).toBe(
      "/app/omnichannel-dist/fulfillment-ops",
    );
    expect(legacyConsolePath(omnichannelDist, "/console/omnichannel-dist/orders")).toBe(
      "/app/omnichannel-dist/list/FulfillmentOrder",
    );
  });

  it("resolves workspace, fulfillment list, new form, and performance report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/omnichannel-dist/fulfillment-ops", { companies: [omnichannelDist] });
    expect(workspace?.document.id).toBe("workspace-fulfillment-ops");
    expect(workspace?.title).toBe("Fulfillment Ops");

    const list = resolveConsoleModuleRoute("/app/omnichannel-dist/list/FulfillmentOrder?filter_status=Picking", {
      companies: [omnichannelDist],
    });
    expect(list?.document.id).toBe("list-fulfillmentorder");
    expect(list?.document.state?.filter_status).toBe("Picking");

    const form = resolveConsoleModuleRoute("/app/omnichannel-dist/edit/FulfillmentOrder/new", { companies: [omnichannelDist] });
    expect(form?.document.id).toBe("form-fulfillmentorder-new");

    const report = resolveConsoleModuleRoute("/app/omnichannel-dist/report/FulfillmentPerformance", {
      companies: [omnichannelDist],
    });
    expect(report?.document.id).toBe("report-fulfillmentperformance");
  });

  it("seeds canonical FulfillmentOrder rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.FulfillmentOrder?.length).toBeGreaterThanOrEqual(60);
    expect(seed.FulfillmentOrder?.[0]).toMatchObject({ id: "FUL-OMNI-0001", companyId: "omnichannel-dist" });
  });
});

