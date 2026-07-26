"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { selectHolds, useStorefrontUiStore } from "@/stores/storefront-ui.store";

const StorefrontHoldClockContext = createContext<number | null>(null);

export function StorefrontHoldClockBoundary({ children }: { children: ReactNode }) {
  const holds = useStorefrontUiStore(selectHolds);
  const removeExpired = useStorefrontUiStore((state) => state.removeExpired);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (holds.length === 0) return;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      removeExpired(current);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [holds.length, removeExpired]);

  return (
    <StorefrontHoldClockContext.Provider value={now}>
      {children}
    </StorefrontHoldClockContext.Provider>
  );
}

export function useStorefrontHoldNow() {
  const now = useContext(StorefrontHoldClockContext);
  if (now === null) {
    throw new Error("useStorefrontHoldNow must be used within StorefrontHoldClockBoundary.");
  }
  return now;
}
