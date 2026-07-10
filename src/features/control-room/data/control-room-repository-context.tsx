"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { ControlRoomStore } from "@/features/control-room/state/control-room-store";
import { createInMemoryControlRoomRepositories } from "@/lib/control-room/data/in-memory/control-room-repositories";
import type { ControlRoomRepositories } from "@/lib/control-room/data/repositories";

const ControlRoomRepositoryContext = createContext<ControlRoomRepositories | null>(null);

export function ControlRoomRepositoryProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: ControlRoomStore;
}) {
  const [repositories] = useState(() => createInMemoryControlRoomRepositories(store));

  return (
    <ControlRoomRepositoryContext.Provider value={repositories}>
      {children}
    </ControlRoomRepositoryContext.Provider>
  );
}

export function useControlRoomRepositories() {
  const repositories = useContext(ControlRoomRepositoryContext);
  if (!repositories) {
    throw new Error("useControlRoomRepositories must be used inside ControlRoomRepositoryProvider");
  }
  return repositories;
}
