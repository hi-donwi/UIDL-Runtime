import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { schoolAbc } from "../companies/schoolAbc";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("school-abc ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(schoolAbc.defaultModule).toBe("school-finance");
    expect(Object.keys(schoolAbc.pages)).toHaveLength(0);

    const paths = navGroups(schoolAbc).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/school-abc/school-finance",
        "/app/school-abc/list/TuitionFee",
        "/app/school-abc/edit/TuitionFee/new",
        "/app/school-abc/report/SchoolManagementReport",
      ]),
    );
    expect(defaultCompanyPath(schoolAbc)).toBe("/app/school-abc/school-finance");
    expect(legacyConsolePath(schoolAbc, "/console/school-abc/dashboard")).toBe("/app/school-abc/school-finance");
    expect(legacyConsolePath(schoolAbc, "/console/school-abc/fees")).toBe("/app/school-abc/list/TuitionFee");
  });

  it("resolves workspace, tuition list, new form, and management report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/school-abc/school-finance", { companies: [schoolAbc] });
    expect(workspace?.document.id).toBe("workspace-school-finance");
    expect(workspace?.title).toBe("School Finance");

    const list = resolveConsoleModuleRoute("/app/school-abc/list/TuitionFee?filter_status=Jatuh%20Tempo", {
      companies: [schoolAbc],
    });
    expect(list?.document.id).toBe("list-tuitionfee");
    expect(list?.document.state?.filter_status).toBe("Jatuh Tempo");

    const form = resolveConsoleModuleRoute("/app/school-abc/edit/TuitionFee/new", { companies: [schoolAbc] });
    expect(form?.document.id).toBe("form-tuitionfee-new");

    const report = resolveConsoleModuleRoute("/app/school-abc/report/SchoolManagementReport", { companies: [schoolAbc] });
    expect(report?.document.id).toBe("report-schoolmanagementreport");
  });

  it("seeds canonical TuitionFee rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.TuitionFee?.length).toBeGreaterThanOrEqual(60);
    expect(seed.TuitionFee?.[0]).toMatchObject({ id: "SPP-2026-0001", companyId: "school-abc" });
  });
});

