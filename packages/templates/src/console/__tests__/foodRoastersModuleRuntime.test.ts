import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { foodRoasters } from "../companies/foodRoasters";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("food-roasters ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(foodRoasters.defaultModule).toBe("roastery-ops");
    expect(Object.keys(foodRoasters.pages)).toHaveLength(0);

    const paths = navGroups(foodRoasters).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/food-roasters/roastery-ops",
        "/app/food-roasters/list/RoastingBatch",
        "/app/food-roasters/edit/RoastingBatch/new",
        "/app/food-roasters/report/RoasteryMarginReport",
      ]),
    );
    expect(defaultCompanyPath(foodRoasters)).toBe("/app/food-roasters/roastery-ops");
    expect(legacyConsolePath(foodRoasters, "/console/food-roasters/dashboard")).toBe("/app/food-roasters/roastery-ops");
    expect(legacyConsolePath(foodRoasters, "/console/food-roasters/roasting")).toBe("/app/food-roasters/list/RoastingBatch");
  });

  it("resolves workspace, roasting batch list, new form, and margin report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/food-roasters/roastery-ops", { companies: [foodRoasters] });
    expect(workspace?.document.id).toBe("workspace-roastery-ops");
    expect(workspace?.title).toBe("Roastery Ops");

    const list = resolveConsoleModuleRoute("/app/food-roasters/list/RoastingBatch?filter_status=Cupping%20Passed", {
      companies: [foodRoasters],
    });
    expect(list?.document.id).toBe("list-roastingbatch");
    expect(list?.document.state?.filter_status).toBe("Cupping Passed");

    const form = resolveConsoleModuleRoute("/app/food-roasters/edit/RoastingBatch/new", { companies: [foodRoasters] });
    expect(form?.document.id).toBe("form-roastingbatch-new");

    const report = resolveConsoleModuleRoute("/app/food-roasters/report/RoasteryMarginReport", { companies: [foodRoasters] });
    expect(report?.document.id).toBe("report-roasterymarginreport");
  });

  it("seeds canonical RoastingBatch rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.RoastingBatch?.length).toBeGreaterThanOrEqual(60);
    expect(seed.RoastingBatch?.[0]).toMatchObject({ id: "ROAST-0001", companyId: "food-roasters" });
  });
});

