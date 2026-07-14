"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AdminRepositoryProvider } from "@/features/admin/data/admin-repository-context";
import { type AdminStore, createAdminStore } from "@/features/admin/state/admin-store";
import type { AdminState } from "@/lib/admin/types";

const AdminContext = createContext<AdminStore | null>(null);

export function AdminProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: AdminState;
}) {
  const [store] = useState(() => createAdminStore(initialState));

  return (
    <AdminContext.Provider value={store}>
      <AdminRepositoryProvider store={store}>{children}</AdminRepositoryProvider>
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const store = useContext(AdminContext);
  if (!store) {
    throw new Error("useAdmin must be used inside AdminProvider");
  }

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return useMemo(
    () => ({
      state,
      saveProduct: store.saveProduct,
      archiveProduct: store.archiveProduct,
      restoreProduct: store.restoreProduct,
      deleteProduct: store.deleteProduct,
      createCatalogueTaxonomy: store.createCatalogueTaxonomy,
      renameCatalogueTaxonomy: store.renameCatalogueTaxonomy,
      deleteCatalogueTaxonomy: store.deleteCatalogueTaxonomy,
      transitionIntake: store.transitionIntake,
      transitionOrder: store.transitionOrder,
      extendHold: store.extendHold,
      releaseHold: store.releaseHold,
      convertHold: store.convertHold,
      recordOfflineSale: store.recordOfflineSale,
      createReturn: store.createReturn,
      transitionReturn: store.transitionReturn,
      addCustomerNote: store.addCustomerNote,
      saveStoreSettings: store.saveStoreSettings,
      resetPrototypeState: store.resetPrototypeState,
    }),
    [state, store],
  );
}

/** @deprecated Use AdminProvider. */
export const ControlRoomProvider = AdminProvider;
/** @deprecated Use useAdmin. */
export const useControlRoom = useAdmin;
