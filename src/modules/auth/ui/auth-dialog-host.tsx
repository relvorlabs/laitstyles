"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestPasswordReset,
  resendSignupConfirmation,
} from "@/app/auth/actions";
import { getAuthFlowErrorMessage } from "@/modules/auth/errors";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import {
  StorefrontAuthDialog,
  type StorefrontAuthForm,
  type StorefrontAuthMode,
  type StorefrontAuthNotice,
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
  const [supportPending, setSupportPending] = useState<"confirmation" | "recovery" | null>(null);
  const [notice, setNotice] = useState<StorefrontAuthNotice | null>(null);
  const successRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    successRef.current = onSuccess ?? null;
    setState("default");
    setErrors(initialError ? { form: getAuthFlowErrorMessage(initialError) } : {});
    setShowErrors(Boolean(initialError));
    setNotice(null);
    setSupportPending(null);
  }, [initialError, onSuccess, open]);

  const submit = useCallback(async () => {
    if (state === "signing-in" || supportPending) return;
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
  }, [actions, form, mode, state, supportPending, termsAccepted]);

  const submitSupportEmail = useCallback(
    async (kind: "confirmation" | "recovery") => {
      if (supportPending || state === "signing-in") return;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
        setErrors({ email: "Enter a valid email address" });
        setShowErrors(true);
        setNotice(null);
        return;
      }

      setSupportPending(kind);
      setErrors({});
      setShowErrors(false);
      setNotice(null);

      const formData = new FormData();
      formData.set("email", form.email.trim());
      const result =
        kind === "recovery"
          ? await requestPasswordReset(formData)
          : await resendSignupConfirmation(formData);

      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        setShowErrors(Boolean(result.error.fieldErrors));
        setNotice({ tone: "error", message: result.error.message });
        setSupportPending(null);
        return;
      }

      setNotice({
        tone: "success",
        message:
          kind === "recovery"
            ? "If this address can receive a reset email, a secure link is on its way."
            : "If this address is eligible for confirmation, a fresh link is on its way.",
      });
      setSupportPending(null);
    },
    [form.email, state, supportPending],
  );

  const resetLocalState = useCallback(() => {
    setState("default");
    setErrors({});
    setShowErrors(false);
    setForm(blankAuthForm);
    setRevealPassword(false);
    setTermsAccepted(false);
    setSupportPending(null);
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
      setSupportPending(null);
      setNotice(null);
    },
    [actions],
  );

  const finish = useCallback(() => {
    const completed = state === "success";
    const onCompleted = successRef.current;
    actions.closeAuthDialog();
    resetLocalState();
    successRef.current = null;

    if (completed) onCompleted?.();
  }, [actions, resetLocalState, state]);

  return (
    <StorefrontAuthDialog
      errors={errors}
      form={form}
      mode={mode}
      notice={notice}
      open={open}
      product={products[13] ?? products[0]}
      revealPassword={revealPassword}
      showErrors={showErrors}
      state={state}
      supportPending={supportPending}
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
      onRequestPasswordReset={() => submitSupportEmail("recovery")}
      onResendConfirmation={() => submitSupportEmail("confirmation")}
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
