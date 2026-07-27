"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const { open, mode, onSuccess } = authContextState.dialog;
  const [state, setState] = useState<StorefrontAuthState>("default");
  const [form, setForm] = useState<StorefrontAuthForm>(blankAuthForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [revealPassword, setRevealPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const successRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    successRef.current = onSuccess ?? null;
    setState("default");
    setErrors({});
    setShowErrors(false);
  }, [open, onSuccess]);

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

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      actions.closeAuthDialog();
      setState("default");
      successRef.current = null;
    },
    [actions],
  );

  const finish = useCallback(() => {
    const completed = state === "success";
    actions.closeAuthDialog();
    setState("default");
    if (completed) successRef.current?.();
    successRef.current = null;
  }, [actions, state]);

  return (
    <StorefrontAuthDialog
      errors={errors}
      form={form}
      mode={mode}
      open={open}
      product={products[13] ?? products[0]}
      remember={remember}
      revealPassword={revealPassword}
      showErrors={showErrors}
      state={state}
      termsAccepted={termsAccepted}
      onContinueWithGoogle={() => {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/auth/google?next=${encodeURIComponent(next)}`);
      }}
      onFinish={finish}
      onModeChange={actions.setAuthDialogMode}
      onOpenChange={onOpenChange}
      onRememberChange={setRemember}
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
