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
import { useRouter } from "next/navigation";
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
import { type Product, productById } from "./catalogue-data";
import { useStorefrontClientState } from "./storefront-client-state-provider";
import {
  buildStorefrontAccountSeedItems,
  type HoldablePiece,
  type StorefrontAccountItem,
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
  holdSecondsByProduct: Readonly<Record<string, number>>;
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

function buildAccountItems(products: readonly Product[]) {
  return buildStorefrontAccountSeedItems(products).map((item) =>
    item.st === "resYou"
      ? { ...item, st: "available" as const, secondsLeft: undefined }
      : item,
  );
}

export function useStorefrontExperience() {
  const context = use(StorefrontExperienceContext);
  if (!context) {
    throw new Error("useStorefrontExperience must be used within StorefrontExperienceProvider");
  }
  return context;
}

export function StorefrontExperienceProvider({
  authSession,
  children,
  products,
}: {
  authSession: StorefrontAuthSession;
  children: ReactNode;
  products: readonly Product[];
}) {
  const router = useRouter();
  const clientState = useStorefrontClientState();
  const [session, setSession] = useState(authSession);
  const [accountItems, setAccountItems] = useState<StorefrontAccountItem[]>(() =>
    buildAccountItems(products),
  );
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

  useEffect(() => setSession(authSession), [authSession]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const heldItems = useMemo<StorefrontAccountItem[]>(
    () =>
      clientState.holds.flatMap((hold) => {
        const product = productById(products, hold.productId);
        const secondsLeft = clientState.holdSecondsByProduct[hold.productId];
        if (!product || !secondsLeft) return [];
        return [
          {
            id: product.id,
            name: product.name,
            cat: product.category,
            size: product.size,
            color: product.colour,
            cond: product.condition,
            priceNum: product.price,
            origNum: product.referencePrice ?? product.price,
            st: "resYou",
            img: product.images[0] ?? "",
            removed: false,
            secondsLeft,
          },
        ];
      }),
    [clientState.holdSecondsByProduct, clientState.holds, products],
  );
  const holdCount = heldItems.length;
  const soonestHoldSeconds = holdCount
    ? Math.min(...heldItems.map((item) => item.secondsLeft ?? 0))
    : 0;
  const items = useMemo(() => {
    const heldIds = new Set(heldItems.map((item) => item.id));
    return [...accountItems.filter((item) => !heldIds.has(item.id)), ...heldItems];
  }, [accountItems, heldItems]);

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
      setAuthErrors({ ...(result.fieldErrors ?? {}), form: result.message });
      setShowAuthErrors(true);
      setAuthState("default");
      return;
    }

    setAuthState(result.status);
    if (result.status === "success") {
      setSession({ signedIn: true, email: result.email });
      router.refresh();
    }
  }, [authForm, authMode, authState, router, termsAccepted]);

  const onAuthOpenChange = useCallback((open: boolean) => {
    setAuthOpen(open);
    if (!open) {
      setAuthState("default");
      authSuccessRef.current = null;
    }
  }, []);

  const updateItems = useCallback(
    (updater: (current: StorefrontAccountItem[]) => StorefrontAccountItem[]) => {
      setAccountItems(updater);
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
      if (!clientState.holdProduct(piece.id)) return;
      setHoldAlertDismissed(false);
      showToast("bag", "Held for you", `"${piece.name}" is held for 15 minutes.`);
    },
    [clientState, showToast],
  );
  const releaseProduct = useCallback(
    (id: string) => clientState.releaseProduct(id),
    [clientState],
  );

  const signOut = useCallback(async () => {
    const result = await signOutStorefrontSession();
    if (!result.ok) {
      showToast("default", "Could not sign out", result.message);
      return;
    }
    setSession({ signedIn: false, email: null });
    router.refresh();
    showToast("default", "Signed out", "Your bag and saved pieces remain in this session.");
  }, [router, showToast]);

  const value = useMemo<StorefrontExperienceContextValue>(
    () => ({
      state: {
        authReady: true,
        heldItems,
        holdCount,
        holdSecondsByProduct: clientState.holdSecondsByProduct,
        items,
        signedIn: session.signedIn,
        soonestHoldSeconds,
        userEmail: session.email,
        userName: null,
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
      clientState.holdSecondsByProduct,
      dismissToast,
      heldItems,
      holdCount,
      holdProduct,
      items,
      openSignin,
      openSignup,
      releaseProduct,
      revealHoldAlert,
      session.email,
      session.signedIn,
      showToast,
      signOut,
      soonestHoldSeconds,
      updateItems,
    ],
  );

  return (
    <StorefrontExperienceContext.Provider value={value}>
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
    </StorefrontExperienceContext.Provider>
  );
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
