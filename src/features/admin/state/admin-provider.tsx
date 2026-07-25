"use client";

import { createContext, type ReactNode, use, useMemo, useState } from "react";

const AdminContext = createContext<{ state: { reportingDate: string } } | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [reportingDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const value = useMemo(() => ({ state: { reportingDate } }), [reportingDate]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = use(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used inside AdminProvider");
  }
  return context;
}
