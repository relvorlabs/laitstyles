"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { AdminStore } from "@/features/admin/state/admin-store";
import { createInMemoryAdminRepositories } from "@/lib/admin/data/in-memory/admin-repositories";
import type { AdminRepositories } from "@/lib/admin/data/repositories";

const AdminRepositoryContext = createContext<AdminRepositories | null>(null);

export function AdminRepositoryProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: AdminStore;
}) {
  const [repositories] = useState(() => createInMemoryAdminRepositories(store));

  return (
    <AdminRepositoryContext.Provider value={repositories}>
      {children}
    </AdminRepositoryContext.Provider>
  );
}

export function useAdminRepositories() {
  const repositories = useContext(AdminRepositoryContext);
  if (!repositories) {
    throw new Error("useAdminRepositories must be used inside AdminRepositoryProvider");
  }
  return repositories;
}

/** @deprecated Use AdminRepositoryProvider. */
export const ControlRoomRepositoryProvider = AdminRepositoryProvider;
/** @deprecated Use useAdminRepositories. */
export const useControlRoomRepositories = useAdminRepositories;
