"use client";

import { createContext, type ReactNode, use, useMemo } from "react";
import {
  getCapabilitiesForRole,
  hasCapability,
  type StaffCapability,
} from "@/modules/auth/permissions";
import type { StaffRole } from "@/modules/auth/types";

type AdminAccessContextValue = {
  role: StaffRole;
  capabilities: readonly StaffCapability[];
  can: (capability: StaffCapability) => boolean;
};

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

export function AdminAccessProvider({ children, role }: { children: ReactNode; role: StaffRole }) {
  const value = useMemo<AdminAccessContextValue>(
    () => ({
      role,
      capabilities: getCapabilitiesForRole(role) as readonly StaffCapability[],
      can: (capability) => hasCapability(role, capability),
    }),
    [role],
  );

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
  const context = use(AdminAccessContext);
  if (!context) throw new Error("useAdminAccess must be used within AdminAccessProvider");
  return context;
}
