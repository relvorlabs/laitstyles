"use client";

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
import type { AuthFlowErrorCode } from "@/modules/auth/errors";
import {
  closeStorefrontOverlays,
  subscribeTransientOverlayClose,
} from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useSession, useSessionActions } from "@/providers/session-provider";
import type { StorefrontAuthForm, StorefrontAuthMode } from "./auth-dialog";

type AuthSubmissionResult =
  | Awaited<ReturnType<typeof submitPasswordSignIn>>
  | Awaited<ReturnType<typeof submitPasswordSignUp>>;

export type AuthDialogState = {
  open: boolean;
  mode: StorefrontAuthMode;
  onSuccess?: () => void;
  initialError?: AuthFlowErrorCode;
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
    openSignin: (onSuccess?: () => void, initialError?: AuthFlowErrorCode) => void;
    openSignup: (onSuccess?: () => void, initialError?: AuthFlowErrorCode) => void;
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
  const { resetSession, setSession } = useSessionActions();
  const [dialog, setDialog] = useState<AuthDialogState>(closedDialog);

  const openSignin = useCallback(
    (onSuccess?: () => void, initialError?: AuthFlowErrorCode) => {
      closeStorefrontOverlays();
      setDialog({ open: true, mode: "signin", onSuccess, initialError });
    },
    [],
  );
  const openSignup = useCallback(
    (onSuccess?: () => void, initialError?: AuthFlowErrorCode) => {
      closeStorefrontOverlays();
      setDialog({ open: true, mode: "signup", onSuccess, initialError });
    },
    [],
  );
  const closeAuthDialog = useCallback(() => {
    setDialog((current) => ({ ...current, open: false, initialError: undefined }));
  }, []);
  const setAuthDialogMode = useCallback((mode: StorefrontAuthMode) => {
    setDialog((current) => ({ ...current, mode, initialError: undefined }));
  }, []);

  useEffect(() => subscribeTransientOverlayClose(closeAuthDialog), [closeAuthDialog]);

  const authenticate = useCallback(
    async (
      mode: StorefrontAuthMode,
      form: StorefrontAuthForm,
      termsAccepted: boolean,
    ): Promise<AuthSubmissionResult> => {
      const current = new URL(window.location.href);
      current.searchParams.set("auth", mode);
      current.searchParams.delete("error");

      const formData = new FormData();
      formData.set("email", form.email.trim());
      formData.set("password", form.password);
      formData.set("first", form.first.trim());
      formData.set("last", form.last.trim());
      formData.set("terms", String(termsAccepted));
      formData.set("next", `${window.location.pathname}${window.location.search}`);
      formData.set("returnTo", `${current.pathname}${current.search}`);

      const result =
        mode === "signup"
          ? await submitPasswordSignUp(formData)
          : await submitPasswordSignIn(formData);

      if (result.ok && result.value.status === "success") {
        const signupName = [form.first.trim(), form.last.trim()].filter(Boolean).join(" ");
        setSession({
          signedIn: true,
          email: result.value.email,
          displayName: signupName || result.value.email.split("@")[0] || null,
          role: null,
        });
      }

      return result;
    },
    [setSession],
  );

  const signOut = useCallback(async () => {
    const result = await signOutStorefrontSession();
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    resetSession();
    toast.success("Signed out. Your bag and saved pieces remain in this session.");
  }, [resetSession]);

  const actions = useMemo<StorefrontAuthContextValue["actions"]>(
    () => ({
      openSignin,
      openSignup,
      closeAuthDialog,
      setAuthDialogMode,
      authenticate,
      signOut,
    }),
    [authenticate, closeAuthDialog, openSignin, openSignup, setAuthDialogMode, signOut],
  );

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
      actions,
    }),
    [actions, authSession.email, authSession.signedIn, dialog, displayName],
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
