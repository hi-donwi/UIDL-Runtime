import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { medicalDevice } from "../companies/medicalDevice";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("medical-device ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(medicalDevice.defaultModule).toBe("quality-manufacturing");
    expect(Object.keys(medicalDevice.pages)).toHaveLength(0);

    const paths = navGroups(medicalDevice).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/medical-device/quality-manufacturing",
        "/app/medical-device/list/DeviceBatch",
        "/app/medical-device/edit/DeviceBatch/new",
        "/app/medical-device/report/MedicalDeviceComplianceReport",
      ]),
    );
    expect(defaultCompanyPath(medicalDevice)).toBe("/app/medical-device/quality-manufacturing");
    expect(legacyConsolePath(medicalDevice, "/console/medical-device/dashboard")).toBe(
      "/app/medical-device/quality-manufacturing",
    );
    expect(legacyConsolePath(medicalDevice, "/console/medical-device/dhr")).toBe("/app/medical-device/list/DeviceBatch");
  });

  it("resolves workspace, batch list, new form, and compliance report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/medical-device/quality-manufacturing", { companies: [medicalDevice] });
    expect(workspace?.document.id).toBe("workspace-quality-manufacturing");
    expect(workspace?.title).toBe("Quality Manufacturing");

    const list = resolveConsoleModuleRoute("/app/medical-device/list/DeviceBatch?filter_status=Sterilization%20Passed", {
      companies: [medicalDevice],
    });
    expect(list?.document.id).toBe("list-devicebatch");
    expect(list?.document.state?.filter_status).toBe("Sterilization Passed");

    const form = resolveConsoleModuleRoute("/app/medical-device/edit/DeviceBatch/new", { companies: [medicalDevice] });
    expect(form?.document.id).toBe("form-devicebatch-new");

    const report = resolveConsoleModuleRoute("/app/medical-device/report/MedicalDeviceComplianceReport", {
      companies: [medicalDevice],
    });
    expect(report?.document.id).toBe("report-medicaldevicecompliancereport");
  });

  it("seeds canonical DeviceBatch rows and DMR records for generated lists", () => {
    const seed = createSeed();
    expect(seed.DeviceBatch?.length).toBeGreaterThanOrEqual(60);
    expect(seed.DeviceBatch?.[0]).toMatchObject({ id: "LOT-MD-0001", companyId: "medical-device" });
    expect(seed.DeviceMasterRecord?.[0]).toMatchObject({ id: "DMR-MD-0001", companyId: "medical-device" });
  });
});
