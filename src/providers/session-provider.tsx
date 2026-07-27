"use client";

import { createContext, type ReactNode, use } from "react";
import type { StaffRole } from "@/lib/auth/roles";

export type AppSession = {
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  role: StaffRole | null;
};

export const ANONYMOUS_APP_SESSION: AppSession = {
  signedIn: false,
  email: null,
  displayName: null,
  role: null,
};

const SessionContext = createContext<AppSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): AppSession {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
