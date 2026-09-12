import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { koperasiBmt } from "../companies/koperasiBmt";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("koperasi-bmt ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(koperasiBmt.defaultModule).toBe("member-finance");
    expect(Object.keys(koperasiBmt.pages)).toHaveLength(0);

    const paths = navGroups(koperasiBmt).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/koperasi-bmt/member-finance",
        "/app/koperasi-bmt/list/MurabahahAgreement",
        "/app/koperasi-bmt/edit/MurabahahAgreement/new",
        "/app/koperasi-bmt/report/KoperasiMemberReport",
      ]),
    );
    expect(defaultCompanyPath(koperasiBmt)).toBe("/app/koperasi-bmt/member-finance");
    expect(legacyConsolePath(koperasiBmt, "/console/koperasi-bmt/dashboard")).toBe("/app/koperasi-bmt/member-finance");
    expect(legacyConsolePath(koperasiBmt, "/console/koperasi-bmt/financing")).toBe(
      "/app/koperasi-bmt/list/MurabahahAgreement",
    );
  });

  it("resolves workspace, financing list, new form, and member report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/koperasi-bmt/member-finance", { companies: [koperasiBmt] });
    expect(workspace?.document.id).toBe("workspace-member-finance");
    expect(workspace?.title).toBe("Member Finance");

    const list = resolveConsoleModuleRoute("/app/koperasi-bmt/list/MurabahahAgreement?filter_status=Aktif", {
      companies: [koperasiBmt],
    });
    expect(list?.document.id).toBe("list-murabahahagreement");
    expect(list?.document.state?.filter_status).toBe("Aktif");

    const form = resolveConsoleModuleRoute("/app/koperasi-bmt/edit/MurabahahAgreement/new", { companies: [koperasiBmt] });
    expect(form?.document.id).toBe("form-murabahahagreement-new");

    const report = resolveConsoleModuleRoute("/app/koperasi-bmt/report/KoperasiMemberReport", { companies: [koperasiBmt] });
    expect(report?.document.id).toBe("report-koperasimemberreport");
  });

  it("seeds canonical MurabahahAgreement rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.MurabahahAgreement?.length).toBeGreaterThanOrEqual(60);
    expect(seed.MurabahahAgreement?.[0]).toMatchObject({ id: "AKAD-MRB-0001", companyId: "koperasi-bmt" });
  });
});
