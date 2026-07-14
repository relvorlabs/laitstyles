"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { AdminStore } from "@/features/admin/state/admin-store";
import { createInMemoryControlRoomRepositories } from "@/lib/control-room/data/in-memory/control-room-repositories";
import type { ControlRoomRepositories } from "@/lib/control-room/data/repositories";

const AdminRepositoryContext = createContext<ControlRoomRepositories | null>(null);

export function AdminRepositoryProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: AdminStore;
}) {
  const [repositories] = useState(() => createInMemoryControlRoomRepositories(store));

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

/** @deprecated Use AdminRepositoryProvider while remaining Admin modules are renamed. */
export const ControlRoomRepositoryProvider = AdminRepositoryProvider;
/** @deprecated Use useAdminRepositories while remaining Admin modules are renamed. */
export const useControlRoomRepositories = useAdminRepositories;
