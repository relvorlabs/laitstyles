"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiClientError } from "@/lib/http/client";
import { sendAuthEmailRequest } from "@/modules/auth/client/auth-email-api";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/modules/auth/errors";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import {
  StorefrontAuthDialog,
  type StorefrontAuthForm,
  type StorefrontAuthMode,
  type StorefrontAuthNotice,
  type StorefrontAuthState,
  type StorefrontAuthSupportMode,
  type StorefrontAuthSupportState,
} from "./auth-dialog";
import { openGoogleOAuthPopup } from "./google-oauth-popup";
import { useStorefrontAuth } from "./storefront-auth-provider";

const blankAuthForm: StorefrontAuthForm = {
  first: "",
  last: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function StorefrontAuthDialogHost() {
  const router = useRouter();
  const { products } = useStorefrontCatalogueData();
  const { actions, state: authContextState } = useStorefrontAuth();
  const { open, mode, onSuccess, initialError, initialSupport } = authContextState.dialog;
  const [state, setState] = useState<StorefrontAuthState>("default");
  const [form, setForm] = useState<StorefrontAuthForm>(blankAuthForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [supportMode, setSupportMode] = useState<StorefrontAuthSupportMode | null>(null);
  const [supportState, setSupportState] = useState<StorefrontAuthSupportState>("idle");
  const [notice, setNotice] = useState<StorefrontAuthNotice | null>(null);
  const successRef = useRef<(() => void) | null>(null);
  const authProduct = useMemo(() => selectAuthProduct(products), [products]);

  useEffect(() => {
    if (!open) return;
    const initialMessage = initialError ? getAuthFlowErrorMessage(initialError) : null;
    successRef.current = onSuccess ?? null;
    setState("default");
    setSupportMode(initialSupport ?? null);
    setSupportState("idle");

    if (initialSupport && initialMessage) {
      setErrors({});
      setShowErrors(false);
      setNotice({ tone: "error", message: initialMessage });
      return;
    }

    setErrors(initialMessage ? { form: initialMessage } : {});
    setShowErrors(Boolean(initialMessage));
    setNotice(null);
  }, [initialError, initialSupport, onSuccess, open]);

  const submit = useCallback(async () => {
    if (state === "signing-in" || supportState === "submitting") return;
    const nextErrors = validateAuth(mode, form, termsAccepted);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setShowErrors(true);
      setNotice(null);
      return;
    }

    setErrors({});
    setShowErrors(false);
    setNotice(null);
    setState("signing-in");
    const result = await actions.authenticate(mode, form, termsAccepted);
    if (!result.ok) {
      setErrors({ ...(result.error.fieldErrors ?? {}), form: result.error.message });
      setShowErrors(true);
      setState("default");
      return;
    }
    setState(result.value.status);
  }, [actions, form, mode, state, supportState, termsAccepted]);

  const submitGoogle = useCallback(async () => {
    if (state === "signing-in" || supportState === "submitting") return;
    setState("signing-in");
    setErrors({});
    setShowErrors(false);
    setNotice(null);

    const current = new URL(window.location.href);
    const next = `${current.pathname}${current.search}`;
    current.searchParams.set("auth", mode);
    current.searchParams.delete("error");
    current.searchParams.delete("support");
    const returnTo = `${current.pathname}${current.search}`;
    const result = await openGoogleOAuthPopup({ next, returnTo });

    if (!result.ok) {
      setErrors({ form: result.message });
      setShowErrors(true);
      setState("default");
      return;
    }

    const target = new URL(result.target, window.location.origin);
    const errorCode = target.searchParams.get("error");
    if (isAuthFlowErrorCode(errorCode)) {
      setErrors({ form: getAuthFlowErrorMessage(errorCode) });
      setShowErrors(true);
      setState("default");
      return;
    }

    const syncResult = await actions.syncOAuthSession();
    if (!syncResult.ok) {
      setErrors({ form: syncResult.message });
      setShowErrors(true);
      setState("default");
      return;
    }

    setState("success");
  }, [actions, mode, state, supportState]);

  const submitSupportEmail = useCallback(async () => {
    if (!supportMode || supportState === "submitting" || state === "signing-in") return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setErrors({ email: "Enter a valid email address" });
      setShowErrors(true);
      setNotice(null);
      return;
    }

    setSupportState("submitting");
    setErrors({});
    setShowErrors(false);
    setNotice(null);

    const current = new URL(window.location.href);
    current.searchParams.set("auth", "signin");
    current.searchParams.set("support", supportMode);
    current.searchParams.delete("error");
    const returnTo = `${current.pathname}${current.search}`;

    try {
      await sendAuthEmailRequest({
        kind: supportMode,
        email: form.email.trim(),
        returnTo,
      });
      setSupportState("success");
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        const fieldErrors = flattenFieldErrors(error.fieldErrors);
        setErrors(fieldErrors);
        setShowErrors(Object.keys(fieldErrors).length > 0);
        setNotice({ tone: "error", message: error.message });
      } else {
        setNotice({
          tone: "error",
          message: "We could not send that email. Check your connection and try again.",
        });
      }
      setSupportState("idle");
    }
  }, [form.email, state, supportMode, supportState]);

  const resetLocalState = useCallback(() => {
    setState("default");
    setErrors({});
    setShowErrors(false);
    setForm(blankAuthForm);
    setRevealPassword(false);
    setTermsAccepted(false);
    setSupportMode(null);
    setSupportState("idle");
    setNotice(null);
  }, []);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      actions.closeAuthDialog();
      resetLocalState();
      successRef.current = null;
    },
    [actions, resetLocalState],
  );

  const onModeChange = useCallback(
    (nextMode: StorefrontAuthMode) => {
      actions.setAuthDialogMode(nextMode);
      setState("default");
      setErrors({});
      setShowErrors(false);
      setForm((current) => ({ ...blankAuthForm, email: current.email }));
      setTermsAccepted(false);
      setRevealPassword(false);
      setSupportMode(null);
      setSupportState("idle");
      setNotice(null);
    },
    [actions],
  );

  const onSupportModeChange = useCallback((nextMode: StorefrontAuthSupportMode | null) => {
    setSupportMode(nextMode);
    setSupportState("idle");
    setState("default");
    setErrors({});
    setShowErrors(false);
    setNotice(null);
    setForm((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));
  }, []);

  const finish = useCallback(() => {
    const completed = state === "success";
    const onCompleted = successRef.current;
    actions.closeAuthDialog();
    resetLocalState();
    successRef.current = null;

    if (!completed) return;
    if (onCompleted) onCompleted();
    else router.push("/account");
  }, [actions, resetLocalState, router, state]);

  return (
    <StorefrontAuthDialog
      errors={errors}
      form={form}
      mode={mode}
      notice={notice}
      open={open}
      product={authProduct}
      revealPassword={revealPassword}
      showErrors={showErrors}
      state={state}
      supportMode={supportMode}
      supportState={supportState}
      termsAccepted={termsAccepted}
      onContinueWithGoogle={submitGoogle}
      onFinish={finish}
      onModeChange={onModeChange}
      onOpenChange={onOpenChange}
      onRevealPasswordChange={setRevealPassword}
      onSubmit={submit}
      onSubmitSupportEmail={submitSupportEmail}
      onSupportModeChange={onSupportModeChange}
      onTermsAcceptedChange={setTermsAccepted}
      setForm={setForm}
    />
  );
}

function selectAuthProduct(products: readonly Product[]): Product | undefined {
  return (
    products.find((product) => product.status === "available" && Boolean(product.id)) ??
    products.find((product) => Boolean(product.id))
  );
}

function flattenFieldErrors(fieldErrors: Record<string, string> | undefined): Record<string, string> {
  return fieldErrors ? { ...fieldErrors } : {};
}

function validateAuth(mode: StorefrontAuthMode, form: StorefrontAuthForm, termsAccepted: boolean) {
  const errors: Record<string, string> = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (mode === "signup" && form.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!form.password) {
    errors.password = "Enter your password";
  }
  if (mode === "signup") {
    if (!form.first.trim()) errors.first = "Required";
    if (!form.last.trim()) errors.last = "Required";
    if (!form.confirmPassword) errors.confirmPassword = "Confirm your password";
    else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    if (!termsAccepted) errors.terms = "Please accept the Terms to continue";
  }
  return errors;
}
