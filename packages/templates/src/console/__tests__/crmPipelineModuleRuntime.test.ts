import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { crmPipeline } from "../companies/crmPipeline";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("crm-pipeline ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(crmPipeline.defaultModule).toBe("sales-pipeline");
    expect(Object.keys(crmPipeline.pages)).toHaveLength(0);

    const paths = navGroups(crmPipeline).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/crm-pipeline/sales-pipeline",
        "/app/crm-pipeline/list/Opportunity",
        "/app/crm-pipeline/edit/Opportunity/new",
        "/app/crm-pipeline/report/WeightedForecast",
      ]),
    );
    expect(defaultCompanyPath(crmPipeline)).toBe("/app/crm-pipeline/sales-pipeline");
    expect(legacyConsolePath(crmPipeline, "/console/crm-pipeline/dashboard")).toBe("/app/crm-pipeline/sales-pipeline");
    expect(legacyConsolePath(crmPipeline, "/console/crm-pipeline/pipeline")).toBe("/app/crm-pipeline/list/Opportunity");
  });

  it("resolves workspace, opportunity list, new form, and weighted forecast report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/crm-pipeline/sales-pipeline", { companies: [crmPipeline] });
    expect(workspace?.document.id).toBe("workspace-sales-pipeline");
    expect(workspace?.title).toBe("Sales Pipeline");

    const list = resolveConsoleModuleRoute("/app/crm-pipeline/list/Opportunity?filter_stage=Proposal", {
      companies: [crmPipeline],
    });
    expect(list?.document.id).toBe("list-opportunity");
    expect(list?.document.state?.filter_stage).toBe("Proposal");

    const form = resolveConsoleModuleRoute("/app/crm-pipeline/edit/Opportunity/new", { companies: [crmPipeline] });
    expect(form?.document.id).toBe("form-opportunity-new");

    const report = resolveConsoleModuleRoute("/app/crm-pipeline/report/WeightedForecast", { companies: [crmPipeline] });
    expect(report?.document.id).toBe("report-weightedforecast");
  });

  it("seeds canonical Opportunity rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.Opportunity?.length).toBeGreaterThanOrEqual(60);
    expect(seed.Opportunity?.[0]).toMatchObject({ id: "OPP-0001", companyId: "crm-pipeline" });
  });
});

