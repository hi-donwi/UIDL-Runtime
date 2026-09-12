import { describe, expect, it } from "vitest";
import { createSeed } from "../../mock-data/seed";
import { helpdesk } from "../companies/helpdesk";
import { defaultCompanyPath, legacyConsolePath, navGroups } from "../navigation";
import { resolveConsoleModuleRoute } from "../moduleRuntime";

describe("helpdesk ModuleSpec runtime", () => {
  it("uses metadata routes instead of PageSpec pages", () => {
    expect(helpdesk.defaultModule).toBe("support-desk");
    expect(Object.keys(helpdesk.pages)).toHaveLength(0);

    const paths = navGroups(helpdesk).flatMap((group) => group.items.map((item: { path: string }) => item.path));
    expect(paths).toEqual(
      expect.arrayContaining([
        "/app/helpdesk/support-desk",
        "/app/helpdesk/list/SupportTicket",
        "/app/helpdesk/report/SupportPerformance",
      ]),
    );
    expect(defaultCompanyPath(helpdesk)).toBe("/app/helpdesk/support-desk");
    expect(legacyConsolePath(helpdesk, "/console/helpdesk/dashboard")).toBe("/app/helpdesk/support-desk");
    expect(legacyConsolePath(helpdesk, "/console/helpdesk/tickets")).toBe("/app/helpdesk/list/SupportTicket");
  });

  it("resolves workspace, ticket list, and performance report from metadata", () => {
    const workspace = resolveConsoleModuleRoute("/app/helpdesk/support-desk", { companies: [helpdesk] });
    expect(workspace?.document.id).toBe("workspace-support-desk");
    expect(workspace?.title).toBe("Support Desk");

    const list = resolveConsoleModuleRoute("/app/helpdesk/list/SupportTicket?filter_status=New", { companies: [helpdesk] });
    expect(list?.document.id).toBe("list-supportticket");
    expect(list?.document.state?.filter_status).toBe("New");

    const report = resolveConsoleModuleRoute("/app/helpdesk/report/SupportPerformance", { companies: [helpdesk] });
    expect(report?.document.id).toBe("report-supportperformance");
  });

  it("seeds canonical SupportTicket rows for generated lists", () => {
    const seed = createSeed();
    expect(seed.SupportTicket?.length).toBeGreaterThanOrEqual(60);
    expect(seed.SupportTicket?.[0]).toMatchObject({ id: "HD-TICK-0001" });
  });
});
