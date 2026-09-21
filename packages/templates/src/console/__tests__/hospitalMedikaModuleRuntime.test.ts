import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { hospitalMedika } from "../companies/hospitalMedika";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("hospital-medika ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(hospitalMedika.defaultModule).toBe("clinical-ops");
    expect(Object.keys(hospitalMedika.pages)).toHaveLength(0);

    const paths = navGroups(hospitalMedika).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/hospital-medika/clinical-ops",
        "/app/hospital-medika/list/PatientAdmission",
        "/app/hospital-medika/edit/PatientAdmission/new",
        "/app/hospital-medika/report/HospitalRevenueReport",
      ]),
    );
    expect(defaultCompanyPath(hospitalMedika)).toBe("/app/hospital-medika/clinical-ops");
    expect(legacyConsolePath(hospitalMedika, "/console/hospital-medika/dashboard")).toBe("/app/hospital-medika/clinical-ops");
    expect(legacyConsolePath(hospitalMedika, "/console/hospital-medika/queue")).toBe(
      "/app/hospital-medika/list/PatientAdmission",
    );
  });

  it("resolves workspace, admission list, new form, and hospital report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/hospital-medika/clinical-ops", { companies: [hospitalMedika] });
    expect(workspace?.document.id).toBe("workspace-clinical-ops");
    expect(workspace?.title).toBe("Clinical Ops");

    const list = resolveConsoleModuleRoute("/app/hospital-medika/list/PatientAdmission?filter_status=Apotek%20Resep", {
      companies: [hospitalMedika],
    });
    expect(list?.document.id).toBe("list-patientadmission");
    expect(list?.document.state?.filter_status).toBe("Apotek Resep");

    const form = resolveConsoleModuleRoute("/app/hospital-medika/edit/PatientAdmission/new", { companies: [hospitalMedika] });
    expect(form?.document.id).toBe("form-patientadmission-new");

    const report = resolveConsoleModuleRoute("/app/hospital-medika/report/HospitalRevenueReport", { companies: [hospitalMedika] });
    expect(report?.document.id).toBe("report-hospitalrevenuereport");
  });

  it("seeds canonical PatientAdmission rows and FEFO drug batches for generated lists", () => {
    const seed = createSeed();
    expect(seed.PatientAdmission?.length).toBeGreaterThanOrEqual(60);
    expect(seed.PatientAdmission?.[0]).toMatchObject({ id: "REG-MED-0001", companyId: "hospital-medika" });
    expect(seed.HospitalDrugBatch?.[0]).toMatchObject({ id: "DRUG-BATCH-0001", drugCode: "AMOX500", stockQty: 100 });
  });
});
