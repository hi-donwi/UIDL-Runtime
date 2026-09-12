import { describe, expect, it } from "vitest";
import {
  createSession,
  getPermissionsForRole,
  hasPermission,
  ROLE_DISCLAIMER,
  STANDARD_ROLES,
} from "../permissionService";

describe("permissionService", () => {
  it("defines standard roles and includes disclaimer text", () => {
    expect(STANDARD_ROLES).toContain("System Manager");
    expect(STANDARD_ROLES).toContain("Accounts Manager");
    expect(STANDARD_ROLES).toContain("Viewer");
    expect(ROLE_DISCLAIMER).toContain("UI gating");
  });

  it("resolves permissions for roles and supports overrides", () => {
    const managerPerms = getPermissionsForRole("Accounts Manager");
    expect(managerPerms["accounts.read"]).toBe(true);
    expect(managerPerms["accounts.submit"]).toBe(true);

    const userPerms = getPermissionsForRole("Accounts User");
    expect(userPerms["accounts.read"]).toBe(true);
    expect(userPerms["accounts.submit"]).toBe(false);

    const overridden = getPermissionsForRole("Accounts User", { "accounts.submit": true });
    expect(overridden["accounts.submit"]).toBe(true);
  });

  it("creates session and checks permissions properly", () => {
    const adminSession = createSession("System Manager", { name: "Super Admin" });
    expect(adminSession.userName).toBe("Super Admin");
    expect(hasPermission(adminSession, "any.permission.key")).toBe(true);

    const userSession = createSession("Sales User");
    expect(hasPermission(userSession, "sales.submit")).toBe(true);
    expect(hasPermission(userSession, "purchase.submit")).toBe(false);
  });
});
