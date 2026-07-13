"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  StorefrontAuthDialog,
  type StorefrontAuthForm,
  type StorefrontAuthMode,
  type StorefrontAuthState,
} from "./storefront-auth-dialog";
import {
  type StorefrontAccountItem,
  storefrontAccountSeedItems,
} from "./storefront-experience-data";
import {
  StorefrontHoldAlert,
  StorefrontToast,
  type StorefrontToastData,
  type StorefrontToastTone,
} from "./storefront-feedback";

type StorefrontExperienceState = {
  authReady: boolean;
  heldItems: StorefrontAccountItem[];
  holdCount: number;
  items: StorefrontAccountItem[];
  signedIn: boolean;
  soonestHoldSeconds: number;
  userEmail: string | null;
  userName: string | null;
};

type StorefrontExperienceActions = {
  dismissToast: () => void;
  openSignin: (onSuccess?: () => void) => void;
  openSignup: (onSuccess?: () => void) => void;
  revealHoldAlert: () => void;
  showToast: (tone: StorefrontToastTone, title: string, message: string) => void;
  signOut: () => Promise<void>;
  updateItems: (updater: (items: StorefrontAccountItem[]) => StorefrontAccountItem[]) => void;
};

type StorefrontExperienceContextValue = {
  actions: StorefrontExperienceActions;
  state: StorefrontExperienceState;
};

const StorefrontExperienceContext = createContext<StorefrontExperienceContextValue | null>(null);

const blankAuthForm: StorefrontAuthForm = {
  first: "",
  last: "",
  email: "",
  password: "",
};

export function useStorefrontExperience() {
  const context = use(StorefrontExperienceContext);
  if (!context) {
    throw new Error("useStorefrontExperience must be used within StorefrontExperienceProvider");
  }
  return context;
}

export function StorefrontExperienceProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StorefrontAccountItem[]>(() =>
    storefrontAccountSeedItems.map((item) => ({ ...item })),
  );
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [holdAlertDismissed, setHoldAlertDismissed] = useState(false);
  const [toast, setToast] = useState<StorefrontToastData | null>(null);
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

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        const user = data.session?.user ?? null;
        setSignedIn(!!user);
        setUserEmail(user?.email ?? null);
        setUserName(readUserName(user?.user_metadata));
        setAuthReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        setSignedIn(!!user);
        setUserEmail(user?.email ?? null);
        setUserName(readUserName(user?.user_metadata));
        setAuthReady(true);
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    } catch {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setItems((current) =>
        current.map((item) => {
          if (item.st !== "resYou") return item;
          const next = (item.secondsLeft || 0) - 1;
          return next <= 0
            ? { ...item, st: "available", secondsLeft: undefined }
            : { ...item, secondsLeft: next };
        }),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const heldItems = useMemo(
    () => items.filter((item) => !item.removed && item.st === "resYou"),
    [items],
  );
  const holdCount = heldItems.length;
  const soonestHoldSeconds = holdCount
    ? Math.min(...heldItems.map((item) => item.secondsLeft || 0))
    : 0;

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
    setAuthOpen(false);
    setAuthState("default");
    if (signedIn) authSuccessRef.current?.();
    authSuccessRef.current = null;
  }, [signedIn]);

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

    try {
      const supabase = createClient();
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: {
            data: {
              first_name: authForm.first.trim(),
              last_name: authForm.last.trim(),
              full_name: `${authForm.first.trim()} ${authForm.last.trim()}`.trim(),
            },
          },
        });
        if (error) throw error;
        setAuthState(data.session ? "success" : "check-email");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });
        if (error) throw error;
        setAuthState("success");
      }
    } catch (error) {
      setAuthErrors({
        form: error instanceof Error ? error.message : "We could not complete that request.",
      });
      setShowAuthErrors(true);
      setAuthState("default");
    }
  }, [authForm, authMode, authState, termsAccepted]);

  const onAuthOpenChange = useCallback((open: boolean) => {
    setAuthOpen(open);
    if (!open) {
      setAuthState("default");
      authSuccessRef.current = null;
    }
  }, []);

  const updateItems = useCallback(
    (updater: (current: StorefrontAccountItem[]) => StorefrontAccountItem[]) => {
      setItems(updater);
    },
    [],
  );
  const showToast = useCallback((tone: StorefrontToastTone, title: string, message: string) => {
    setToast({ tone, title, message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const revealHoldAlert = useCallback(() => setHoldAlertDismissed(false), []);
  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setSignedIn(false);
      setUserEmail(null);
      setUserName(null);
      showToast("default", "Signed out", "Your bag and saved pieces remain in this session.");
    } catch (error) {
      showToast(
        "default",
        "Could not sign out",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [showToast]);

  const value = useMemo<StorefrontExperienceContextValue>(
    () => ({
      state: {
        authReady,
        heldItems,
        holdCount,
        items,
        signedIn,
        soonestHoldSeconds,
        userEmail,
        userName,
      },
      actions: {
        dismissToast,
        openSignin,
        openSignup,
        revealHoldAlert,
        showToast,
        signOut,
        updateItems,
      },
    }),
    [
      authReady,
      dismissToast,
      heldItems,
      holdCount,
      items,
      openSignin,
      openSignup,
      revealHoldAlert,
      showToast,
      signedIn,
      signOut,
      soonestHoldSeconds,
      updateItems,
      userEmail,
      userName,
    ],
  );

  return (
    <StorefrontExperienceContext value={value}>
      {children}
      {holdCount > 0 && !holdAlertDismissed ? (
        <StorefrontHoldAlert
          count={holdCount}
          onDismiss={() => setHoldAlertDismissed(true)}
          secondsLeft={soonestHoldSeconds}
        />
      ) : null}
      {toast ? <StorefrontToast dismiss={dismissToast} toast={toast} /> : null}
      <StorefrontAuthDialog
        errors={authErrors}
        form={authForm}
        mode={authMode}
        open={authOpen}
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
    </StorefrontExperienceContext>
  );
}

function readUserName(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.full_name ?? metadata?.name ?? metadata?.first_name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateAuth(mode: StorefrontAuthMode, form: StorefrontAuthForm, termsAccepted: boolean) {
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
