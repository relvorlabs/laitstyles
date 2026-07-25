"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  signOutStorefrontSession,
  submitPasswordSignIn,
  submitPasswordSignUp,
} from "@/app/auth/actions";
import {
  type StorefrontAuthForm,
  type StorefrontAuthMode,
} from "./storefront-auth-dialog";
import { openAuthDialog } from "./storefront-overlay-events";
import type { StorefrontAuthSession } from "./storefront-auth-session";

type AuthSubmissionResult =
  | Awaited<ReturnType<typeof submitPasswordSignIn>>
  | Awaited<ReturnType<typeof submitPasswordSignUp>>;

type StorefrontAuthContextValue = {
  state: {
    authReady: true;
    signedIn: boolean;
    userEmail: string | null;
    userName: string | null;
  };
  actions: {
    openSignin: (onSuccess?: () => void) => void;
    openSignup: (onSuccess?: () => void) => void;
    authenticate: (
      mode: StorefrontAuthMode,
      form: StorefrontAuthForm,
      termsAccepted: boolean,
    ) => Promise<AuthSubmissionResult>;
    signOut: () => Promise<void>;
  };
};

const StorefrontAuthContext = createContext<StorefrontAuthContextValue | null>(null);

export function StorefrontAuthProvider({
  authSession,
  children,
}: {
  authSession: StorefrontAuthSession;
  children: ReactNode;
}) {
  const router = useRouter();
  const openSignin = useCallback(
    (onSuccess?: () => void) => openAuthDialog({ mode: "signin", onSuccess }),
    [],
  );
  const openSignup = useCallback(
    (onSuccess?: () => void) => openAuthDialog({ mode: "signup", onSuccess }),
    [],
  );

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
      },
      actions: { openSignin, openSignup, authenticate, signOut },
    }),
    [
      authSession.email,
      authSession.signedIn,
      authenticate,
      displayName,
      openSignin,
      openSignup,
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
