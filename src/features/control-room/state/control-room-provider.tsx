"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createControlRoomStore,
  type ControlRoomStore,
} from "@/features/control-room/state/control-room-store";
import { ControlRoomRepositoryProvider } from "@/lib/control-room/data/repository-context";
import type { ControlRoomState } from "@/lib/control-room/types";

const ControlRoomContext = createContext<ControlRoomStore | null>(null);

export function ControlRoomProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: ControlRoomState;
}) {
  const [store] = useState(() => createControlRoomStore(initialState));

  return (
    <ControlRoomContext.Provider value={store}>
      <ControlRoomRepositoryProvider store={store}>
        {children}
      </ControlRoomRepositoryProvider>
    </ControlRoomContext.Provider>
  );
}

export function useControlRoom() {
  const store = useContext(ControlRoomContext);
  if (!store) {
    throw new Error("useControlRoom must be used inside ControlRoomProvider");
  }

  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

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
