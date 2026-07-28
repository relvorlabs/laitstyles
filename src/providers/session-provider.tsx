"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { StaffRole } from "@/modules/auth/types";

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

type SessionActions = {
  setSession: Dispatch<SetStateAction<AppSession>>;
  resetSession: () => void;
};

const SessionContext = createContext<AppSession | null>(null);
const SessionActionsContext = createContext<SessionActions | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  const [currentSession, setSession] = useState(session);

  useEffect(() => {
    setSession(session);
  }, [session]);

  const resetSession = useCallback(() => {
    setSession(ANONYMOUS_APP_SESSION);
  }, []);
  const actions = useMemo<SessionActions>(() => ({ setSession, resetSession }), [resetSession]);

  return (
    <SessionActionsContext.Provider value={actions}>
      <SessionContext.Provider value={currentSession}>{children}</SessionContext.Provider>
    </SessionActionsContext.Provider>
  );
}

export function useSession(): AppSession {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

export function useSessionActions(): SessionActions {
  const context = use(SessionActionsContext);
  if (!context) {
    throw new Error("useSessionActions must be used within SessionProvider");
  }
  return context;
}
