/**
 * `useSession` — Session and role management hook with UI gating support.
 */

import { useCallback, useState } from "react";
import {
  STANDARD_ROLES,
  createSession,
  hasPermission as checkPermission,
  ROLE_DISCLAIMER,
  type SessionContext,
} from "../services/permissionService";

const STORAGE_KEY = "vb-demo-session-role";

export interface UseSessionResult {
  session: SessionContext;
  role: string;
  setRole: (role: string) => void;
  hasPermission: (permissionKey: string) => boolean;
  availableRoles: readonly string[];
  disclaimer: string;
}

export function useSession(defaultRole: string = "System Manager"): UseSessionResult {
  const [role, setRoleState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || defaultRole;
    } catch {
      return defaultRole;
    }
  });

  const [session, setSession] = useState<SessionContext>(() => createSession(role));

  const setRole = useCallback((newRole: string) => {
    setRoleState(newRole);
    const newSession = createSession(newRole);
    setSession(newSession);
    try {
      localStorage.setItem(STORAGE_KEY, newRole);
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, []);

  const hasPerm = useCallback(
    (permKey: string) => checkPermission(session, permKey),
    [session],
  );

  return {
    session,
    role,
    setRole,
    hasPermission: hasPerm,
    availableRoles: STANDARD_ROLES,
    disclaimer: ROLE_DISCLAIMER,
  };
}
