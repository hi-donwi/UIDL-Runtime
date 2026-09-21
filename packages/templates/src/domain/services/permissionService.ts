/**
 * Permission Service & Role-Based Access Control.
 *
 * Resolves user roles to boolean permission sets for UI element visibility
 * and navigation gating.
 */

export interface SessionContext extends Record<string, unknown> {
  userId?: string;
  userName?: string;
  userEmail?: string;
  roles?: string[];
  permissions?: Record<string, boolean>;
}

export const ROLE_DISCLAIMER =
  "Gating peran pada antarmuka ini adalah penyesuaian tampilan (UI gating), bukan batas keamanan server-side.";

export const STANDARD_ROLES = [
  "System Manager",
  "Accounts Manager",
  "Accounts User",
  "Sales User",
  "Purchase User",
  "Stock User",
  "Auditor",
  "Viewer",
] as const;

export type StandardRole = typeof STANDARD_ROLES[number];

/** Default permission maps per role */
const ROLE_PERMISSIONS_MAP: Record<string, Record<string, boolean>> = {
  "System Manager": {
    "system.manage": true,
    "accounts.read": true,
    "accounts.write": true,
    "accounts.submit": true,
    "accounts.delete": true,
    "sales.read": true,
    "sales.write": true,
    "sales.submit": true,
    "purchase.read": true,
    "purchase.write": true,
    "purchase.submit": true,
    "stock.read": true,
    "stock.write": true,
    "audit.read": true,
  },
  "Accounts Manager": {
    "accounts.read": true,
    "accounts.write": true,
    "accounts.submit": true,
    "accounts.delete": true,
    "sales.read": true,
    "purchase.read": true,
    "audit.read": true,
  },
  "Accounts User": {
    "accounts.read": true,
    "accounts.write": true,
    "accounts.submit": false,
    "sales.read": true,
    "purchase.read": true,
  },
  "Sales User": {
    "sales.read": true,
    "sales.write": true,
    "sales.submit": true,
    "accounts.read": true,
  },
  "Purchase User": {
    "purchase.read": true,
    "purchase.write": true,
    "purchase.submit": true,
    "stock.read": true,
  },
  "Stock User": {
    "stock.read": true,
    "stock.write": true,
    "purchase.read": true,
  },
  "Auditor": {
    "accounts.read": true,
    "sales.read": true,
    "purchase.read": true,
    "stock.read": true,
    "audit.read": true,
  },
  "Viewer": {
    "accounts.read": true,
    "sales.read": true,
    "purchase.read": true,
    "stock.read": true,
  },
};

/**
 * Resolves permissions for a given role name.
 */
export function getPermissionsForRole(
  role: string,
  customOverrides: Record<string, boolean> = {},
): Record<string, boolean> {
  const base = ROLE_PERMISSIONS_MAP[role] ?? ROLE_PERMISSIONS_MAP["Viewer"];
  return { ...base, ...customOverrides };
}

/**
 * Checks whether a session holds a specific permission.
 */
export function hasPermission(
  session: SessionContext | undefined,
  permissionKey: string,
): boolean {
  if (!session) return true;
  if (session.roles?.includes("System Manager") || session.roles?.includes("admin")) {
    return true;
  }
  return Boolean(session.permissions?.[permissionKey]);
}

/**
 * Creates a standard `SessionContext` for a given role.
 */
export function createSession(
  role: string = "System Manager",
  user: { id?: string; name?: string; email?: string } = {},
): SessionContext {
  const permissions = getPermissionsForRole(role);
  return {
    userId: user.id ?? "user-demo",
    userName: user.name ?? "Demo User",
    userEmail: user.email ?? "demo@example.com",
    roles: [role],
    permissions,
  };
}
