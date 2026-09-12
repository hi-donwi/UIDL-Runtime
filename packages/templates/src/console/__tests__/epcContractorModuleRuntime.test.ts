import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { epcContractor } from "../companies/epcContractor";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("epc-contractor ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(epcContractor.defaultModule).toBe("project-controls");
    expect(Object.keys(epcContractor.pages)).toHaveLength(0);

    const paths = navGroups(epcContractor).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/epc-contractor/project-controls",
        "/app/epc-contractor/list/ProjectMilestone",
        "/app/epc-contractor/edit/ProjectMilestone/new",
        "/app/epc-contractor/report/EPCProgressReport",
      ]),
    );
    expect(defaultCompanyPath(epcContractor)).toBe("/app/epc-contractor/project-controls");
    expect(legacyConsolePath(epcContractor, "/console/epc-contractor/dashboard")).toBe(
      "/app/epc-contractor/project-controls",
    );
    expect(legacyConsolePath(epcContractor, "/console/epc-contractor/wbs")).toBe(
      "/app/epc-contractor/list/ProjectMilestone",
    );
  });

  it("resolves workspace, milestone list, new form, and EPC progress report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/epc-contractor/project-controls", { companies: [epcContractor] });
    expect(workspace?.document.id).toBe("workspace-project-controls");
    expect(workspace?.title).toBe("Project Controls");

    const list = resolveConsoleModuleRoute("/app/epc-contractor/list/ProjectMilestone?filter_status=Certified%20PoC", {
      companies: [epcContractor],
    });
    expect(list?.document.id).toBe("list-projectmilestone");
    expect(list?.document.state?.filter_status).toBe("Certified PoC");

    const form = resolveConsoleModuleRoute("/app/epc-contractor/edit/ProjectMilestone/new", { companies: [epcContractor] });
    expect(form?.document.id).toBe("form-projectmilestone-new");

    const report = resolveConsoleModuleRoute("/app/epc-contractor/report/EPCProgressReport", { companies: [epcContractor] });
    expect(report?.document.id).toBe("report-epcprogressreport");
  });

  it("seeds canonical ProjectMilestone rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.ProjectMilestone?.length).toBeGreaterThanOrEqual(60);
    expect(seed.ProjectMilestone?.[0]).toMatchObject({ id: "MLS-0001", companyId: "epc-contractor" });
  });
});
