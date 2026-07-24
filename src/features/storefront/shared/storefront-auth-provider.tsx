"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  signOutStorefrontSession,
  submitPasswordSignIn,
  submitPasswordSignUp,
} from "@/app/auth/actions";
import type { StorefrontAuthSession } from "./storefront-auth-session";
import {
  StorefrontAuthDialog,
  type StorefrontAuthForm,
  type StorefrontAuthMode,
  type StorefrontAuthState,
} from "./storefront-auth-dialog";
import type { Product } from "./catalogue-data";

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
    signOut: () => Promise<void>;
  };
};

const StorefrontAuthContext = createContext<StorefrontAuthContextValue | null>(null);

const blankAuthForm: StorefrontAuthForm = {
  first: "",
  last: "",
  email: "",
  password: "",
};

export function StorefrontAuthProvider({
  authSession,
  children,
  products,
}: {
  authSession: StorefrontAuthSession;
  children: ReactNode;
  products: readonly Product[];
}) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<StorefrontAuthMode>("signin");
  const [authState, setAuthState] = useState<StorefrontAuthState>("default");
  const [authForm, setAuthForm] = useState<StorefrontAuthForm>(blankAuthForm);
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});
  const [showAuthErrors, setShowAuthErrors] = useState(false);
  const [authReveal, setAuthReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const authSuccessRef = useRef<(() => void) | null>(null);

  const openAuth = useCallback((mode: StorefrontAuthMode, onSuccess?: () => void) => {
    authSuccessRef.current = onSuccess ?? null;
    setAuthMode(mode);
    setAuthState("default");
    setShowAuthErrors(false);
    setAuthErrors({});
    setAuthOpen(true);
  }, []);
  const openSignin = useCallback(
    (onSuccess?: () => void) => openAuth("signin", onSuccess),
    [openAuth],
  );
  const openSignup = useCallback(
    (onSuccess?: () => void) => openAuth("signup", onSuccess),
    [openAuth],
  );

  const finishAuth = useCallback(() => {
    const completed = authState === "success";
    setAuthOpen(false);
    setAuthState("default");
    if (completed) authSuccessRef.current?.();
    authSuccessRef.current = null;
  }, [authState]);

  const submitAuth = useCallback(async () => {
    if (authState === "signing-in") return;
    const errors = validateAuth(authMode, authForm, termsAccepted);
    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      setShowAuthErrors(true);
      return;
    }

    setAuthErrors({});
    setShowAuthErrors(false);
    setAuthState("signing-in");

    const formData = new FormData();
    formData.set("email", authForm.email.trim());
    formData.set("password", authForm.password);
    formData.set("first", authForm.first.trim());
    formData.set("last", authForm.last.trim());
    formData.set("next", `${window.location.pathname}${window.location.search}`);

    const result =
      authMode === "signup"
        ? await submitPasswordSignUp(formData)
        : await submitPasswordSignIn(formData);

    if (!result.ok) {
      setAuthErrors({ ...(result.error.fieldErrors ?? {}), form: result.error.message });
      setShowAuthErrors(true);
      setAuthState("default");
      return;
    }

    setAuthState(result.value.status);
    if (result.value.status === "success") router.refresh();
  }, [authForm, authMode, authState, router, termsAccepted]);

  const onAuthOpenChange = useCallback((open: boolean) => {
    setAuthOpen(open);
    if (!open) {
      setAuthState("default");
      authSuccessRef.current = null;
    }
  }, []);

  const signOut = useCallback(async () => {
    const result = await signOutStorefrontSession();
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    router.refresh();
    toast.success("Signed out. Your bag and saved pieces remain in this session.");
  }, [router]);

  const displayName = authSession.email?.split("@")[0] ?? null;
  const value = useMemo<StorefrontAuthContextValue>(
    () => ({
      state: {
        authReady: true,
        signedIn: authSession.signedIn,
        userEmail: authSession.email,
        userName: displayName,
      },
      actions: { openSignin, openSignup, signOut },
    }),
    [
      authSession.email,
      authSession.signedIn,
      displayName,
      openSignin,
      openSignup,
      signOut,
    ],
  );

  return (
    <StorefrontAuthContext.Provider value={value}>
      {children}
      <StorefrontAuthDialog
        errors={authErrors}
        form={authForm}
        mode={authMode}
        open={authOpen}
        product={products[13] ?? products[0]}
        remember={remember}
        revealPassword={authReveal}
        showErrors={showAuthErrors}
        state={authState}
        termsAccepted={termsAccepted}
        onContinueWithGoogle={() => {
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.assign(`/auth/google?next=${encodeURIComponent(next)}`);
        }}
        onFinish={finishAuth}
        onModeChange={setAuthMode}
        onOpenChange={onAuthOpenChange}
        onRememberChange={setRemember}
        onRevealPasswordChange={setAuthReveal}
        onSubmit={submitAuth}
        onTermsAcceptedChange={setTermsAccepted}
        setForm={setAuthForm}
      />
    </StorefrontAuthContext.Provider>
  );
}

export function useStorefrontAuth() {
  const context = use(StorefrontAuthContext);
  if (!context) {
    throw new Error("useStorefrontAuth must be used within StorefrontAuthProvider");
  }
  return context;
}

function validateAuth(
  mode: StorefrontAuthMode,
  form: StorefrontAuthForm,
  termsAccepted: boolean,
) {
  const errors: Record<string, string> = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
  if (mode === "signup") {
    if (!form.first.trim()) errors.first = "Required";
    if (!form.last.trim()) errors.last = "Required";
    if (!termsAccepted) errors.terms = "Please accept the Terms to continue";
  }
  return errors;
}
