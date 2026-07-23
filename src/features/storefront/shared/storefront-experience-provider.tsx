"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
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
import type { Product } from "./catalogue-data";
import {
  StorefrontAuthDialog,
  type StorefrontAuthForm,
  type StorefrontAuthMode,
  type StorefrontAuthState,
} from "./storefront-auth-dialog";
import {
  applyHold,
  applyRelease,
  buildStorefrontAccountSeedItems,
  HOLD_SECONDS,
  type HoldablePiece,
  type HoldsRecord,
  holdsToItems,
  pruneExpiredHolds,
  readPersistedHolds,
  type StorefrontAccountItem,
  tickHolds,
  writePersistedHolds,
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
  holdSecondsByProduct: Record<string, number>;
  items: StorefrontAccountItem[];
  signedIn: boolean;
  soonestHoldSeconds: number;
  userEmail: string | null;
  userName: string | null;
};

type StorefrontExperienceActions = {
  dismissToast: () => void;
  holdProduct: (piece: HoldablePiece) => void;
  openSignin: (onSuccess?: () => void) => void;
  openSignup: (onSuccess?: () => void) => void;
  releaseProduct: (id: string) => void;
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

export function StorefrontExperienceProvider({
  children,
  products,
}: {
  children: ReactNode;
  products: readonly Product[];
}) {
  const [items, setItems] = useState<StorefrontAccountItem[]>(() =>
    buildStorefrontAccountSeedItems(products),
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
  // Absolute-expiry record for storefront-originated holds, mirrored to sessionStorage
  // so a live countdown survives reload. Seed holds are not tracked here.
  const holdsRef = useRef<HoldsRecord>({});

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
        if (!active) return;
        const user = data.session?.user ?? null;
        setSignedIn(!!user);
        setUserEmail(user?.email ?? null);
        setUserName(readUserName(user?.user_metadata));
        setAuthReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          const user = session?.user ?? null;
          setSignedIn(!!user);
          setUserEmail(user?.email ?? null);
          setUserName(readUserName(user?.user_metadata));
          setAuthReady(true);
        },
      );
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    } catch {
      setAuthReady(true);
    }
  }, []);

  // Rehydrate storefront holds from sessionStorage once, on mount (deferred so it does
  // not diverge from the seed-only server render and cause a hydration mismatch).
  useEffect(() => {
    const now = Date.now();
    const record = pruneExpiredHolds(readPersistedHolds(), now);
    holdsRef.current = record;
    writePersistedHolds(record);
    const rehydrated = holdsToItems(record, now);
    if (rehydrated.length === 0) return;
    setItems((current) => {
      const known = new Set(current.map((item) => item.id));
      return [...current, ...rehydrated.filter((item) => !known.has(item.id))];
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setItems((current) => tickHolds(current));
      const pruned = pruneExpiredHolds(holdsRef.current, Date.now());
      if (Object.keys(pruned).length !== Object.keys(holdsRef.current).length) {
        holdsRef.current = pruned;
        writePersistedHolds(pruned);
      }
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
  const holdSecondsByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of heldItems) map[item.id] = item.secondsLeft ?? 0;
    return map;
  }, [heldItems]);

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

  const holdProduct = useCallback(
    (piece: HoldablePiece) => {
      const expiresAt = Date.now() + HOLD_SECONDS * 1000;
      holdsRef.current = { ...holdsRef.current, [piece.id]: { expiresAt, piece } };
      writePersistedHolds(holdsRef.current);
      setItems((current) => applyHold(current, piece));
      setHoldAlertDismissed(false);
      showToast("bag", "Held for you", `"${piece.name}" is held for 15 minutes.`);
    },
    [showToast],
  );

  const releaseProduct = useCallback((id: string) => {
    if (holdsRef.current[id]) {
      const { [id]: _removed, ...rest } = holdsRef.current;
      holdsRef.current = rest;
      writePersistedHolds(holdsRef.current);
    }
    setItems((current) => applyRelease(current, id));
  }, []);
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
        holdSecondsByProduct,
        items,
        signedIn,
        soonestHoldSeconds,
        userEmail,
        userName,
      },
      actions: {
        dismissToast,
        holdProduct,
        openSignin,
        openSignup,
        releaseProduct,
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
      holdProduct,
      holdSecondsByProduct,
      items,
      openSignin,
      openSignup,
      releaseProduct,
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
