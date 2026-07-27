"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  signOutStorefrontSession,
  submitPasswordSignIn,
  submitPasswordSignUp,
} from "@/app/auth/actions";
import {
  closeStorefrontOverlays,
  subscribeTransientOverlayClose,
} from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useSession } from "@/providers/session-provider";
import type { StorefrontAuthForm, StorefrontAuthMode } from "./auth-dialog";

type AuthSubmissionResult =
  | Awaited<ReturnType<typeof submitPasswordSignIn>>
  | Awaited<ReturnType<typeof submitPasswordSignUp>>;

export type AuthDialogState = {
  open: boolean;
  mode: StorefrontAuthMode;
  onSuccess?: () => void;
};

type StorefrontAuthContextValue = {
  state: {
    authReady: true;
    signedIn: boolean;
    userEmail: string | null;
    userName: string | null;
    dialog: AuthDialogState;
  };
  actions: {
    openSignin: (onSuccess?: () => void) => void;
    openSignup: (onSuccess?: () => void) => void;
    closeAuthDialog: () => void;
    setAuthDialogMode: (mode: StorefrontAuthMode) => void;
    authenticate: (
      mode: StorefrontAuthMode,
      form: StorefrontAuthForm,
      termsAccepted: boolean,
    ) => Promise<AuthSubmissionResult>;
    signOut: () => Promise<void>;
  };
};

const StorefrontAuthContext = createContext<StorefrontAuthContextValue | null>(null);

const closedDialog: AuthDialogState = { open: false, mode: "signin" };

export function StorefrontAuthProvider({ children }: { children: ReactNode }) {
  const authSession = useSession();
  const router = useRouter();
  const [dialog, setDialog] = useState<AuthDialogState>(closedDialog);

  const openSignin = useCallback((onSuccess?: () => void) => {
    closeStorefrontOverlays();
    setDialog({ open: true, mode: "signin", onSuccess });
  }, []);
  const openSignup = useCallback((onSuccess?: () => void) => {
    closeStorefrontOverlays();
    setDialog({ open: true, mode: "signup", onSuccess });
  }, []);
  const closeAuthDialog = useCallback(() => {
    setDialog((current) => ({ ...current, open: false }));
  }, []);
  const setAuthDialogMode = useCallback((mode: StorefrontAuthMode) => {
    setDialog((current) => ({ ...current, mode }));
  }, []);

  useEffect(() => subscribeTransientOverlayClose(closeAuthDialog), [closeAuthDialog]);

  const authenticate = useCallback(
    async (
      mode: StorefrontAuthMode,
      form: StorefrontAuthForm,
      termsAccepted: boolean,
    ): Promise<AuthSubmissionResult> => {
      const formData = new FormData();
      formData.set("email", form.email.trim());
      formData.set("password", form.password);
      formData.set("first", form.first.trim());
      formData.set("last", form.last.trim());
      formData.set("terms", String(termsAccepted));
      formData.set("next", `${window.location.pathname}${window.location.search}`);

      const result =
        mode === "signup"
          ? await submitPasswordSignUp(formData)
          : await submitPasswordSignIn(formData);

      if (result.ok && result.value.status === "success") router.refresh();
      return result;
    },
    [router],
  );

  const signOut = useCallback(async () => {
    const result = await signOutStorefrontSession();
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    router.refresh();
    toast.success("Signed out. Your bag and saved pieces remain in this session.");
  }, [router]);

  const displayName = authSession.displayName ?? authSession.email?.split("@")[0] ?? null;
  const value = useMemo<StorefrontAuthContextValue>(
    () => ({
      state: {
        authReady: true,
        signedIn: authSession.signedIn,
        userEmail: authSession.email,
        userName: displayName,
        dialog,
      },
      actions: {
        openSignin,
        openSignup,
        closeAuthDialog,
        setAuthDialogMode,
        authenticate,
        signOut,
      },
    }),
    [
      authSession.email,
      authSession.signedIn,
      authenticate,
      closeAuthDialog,
      dialog,
      displayName,
      openSignin,
      openSignup,
      setAuthDialogMode,
      signOut,
    ],
  );

  return <StorefrontAuthContext.Provider value={value}>{children}</StorefrontAuthContext.Provider>;
}

export function useStorefrontAuth() {
  const context = use(StorefrontAuthContext);
  if (!context) {
    throw new Error("useStorefrontAuth must be used within StorefrontAuthProvider");
  }
  return context;
}
