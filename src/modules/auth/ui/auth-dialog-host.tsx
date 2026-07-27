"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { getAuthFlowErrorMessage } from "@/modules/auth/errors";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import {
  StorefrontAuthDialog,
  type StorefrontAuthForm,
  type StorefrontAuthMode,
  type StorefrontAuthState,
} from "./auth-dialog";
import { useStorefrontAuth } from "./storefront-auth-provider";

const blankAuthForm: StorefrontAuthForm = {
  first: "",
  last: "",
  email: "",
  password: "",
};

export function StorefrontAuthDialogHost() {
  const { products } = useStorefrontCatalogueData();
  const { actions, state: authContextState } = useStorefrontAuth();
  const { open, mode, onSuccess, initialError } = authContextState.dialog;
  const [state, setState] = useState<StorefrontAuthState>("default");
  const [form, setForm] = useState<StorefrontAuthForm>(blankAuthForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const successRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    successRef.current = onSuccess ?? null;
    setState("default");
    setErrors(initialError ? { form: getAuthFlowErrorMessage(initialError) } : {});
    setShowErrors(Boolean(initialError));
  }, [initialError, onSuccess, open]);

  const submit = useCallback(async () => {
    if (state === "signing-in") return;
    const nextErrors = validateAuth(mode, form, termsAccepted);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setShowErrors(true);
      return;
    }

    setErrors({});
    setShowErrors(false);
    setState("signing-in");
    const result = await actions.authenticate(mode, form, termsAccepted);
    if (!result.ok) {
      setErrors({ ...(result.error.fieldErrors ?? {}), form: result.error.message });
      setShowErrors(true);
      setState("default");
      return;
    }
    setState(result.value.status);
  }, [actions, form, mode, state, termsAccepted]);

  const resetLocalState = useCallback(() => {
    setState("default");
    setErrors({});
    setShowErrors(false);
    setForm(blankAuthForm);
    setRevealPassword(false);
    setTermsAccepted(false);
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
    },
    [actions],
  );

  const finish = useCallback(() => {
    const completed = state === "success";
    const onCompleted = successRef.current;
    actions.closeAuthDialog();
    resetLocalState();
    successRef.current = null;

    if (!completed) return;
    if (onCompleted) onCompleted();
    else startTransition(actions.refreshSession);
  }, [actions, resetLocalState, state]);

  return (
    <StorefrontAuthDialog
      errors={errors}
      form={form}
      mode={mode}
      open={open}
      product={products[13] ?? products[0]}
      revealPassword={revealPassword}
      showErrors={showErrors}
      state={state}
      termsAccepted={termsAccepted}
      onContinueWithGoogle={() => {
        const current = new URL(window.location.href);
        const next = `${current.pathname}${current.search}`;
        current.searchParams.set("auth", mode);
        current.searchParams.delete("error");
        const returnTo = `${current.pathname}${current.search}`;
        window.location.assign(
          `/auth/google?next=${encodeURIComponent(next)}&returnTo=${encodeURIComponent(returnTo)}`,
        );
      }}
      onFinish={finish}
      onModeChange={onModeChange}
      onOpenChange={onOpenChange}
      onRevealPasswordChange={setRevealPassword}
      onSubmit={submit}
      onTermsAcceptedChange={setTermsAccepted}
      setForm={setForm}
    />
  );
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
    if (!termsAccepted) errors.terms = "Please accept the Terms to continue";
  }
  return errors;
}
