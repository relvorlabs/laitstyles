"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MailCheck,
  Sparkles,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CloudImage } from "@/components/ui/cloud-image";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";

export type StorefrontAuthMode = "signin" | "signup";
export type StorefrontAuthState = "default" | "signing-in" | "success" | "check-email";
export type StorefrontAuthSupportMode = "recovery" | "confirmation";
export type StorefrontAuthSupportState = "idle" | "submitting" | "success";
export type StorefrontAuthForm = {
  first: string;
  last: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type StorefrontAuthNotice = {
  tone: "error" | "success";
  message: string;
};

type StorefrontAuthDialogProps = {
  errors: Record<string, string>;
  form: StorefrontAuthForm;
  mode: StorefrontAuthMode;
  notice: StorefrontAuthNotice | null;
  open: boolean;
  product: Product | undefined;
  revealPassword: boolean;
  showErrors: boolean;
  state: StorefrontAuthState;
  supportMode: StorefrontAuthSupportMode | null;
  supportState: StorefrontAuthSupportState;
  termsAccepted: boolean;
  onContinueWithGoogle: () => void;
  onFinish: () => void;
  onModeChange: (mode: StorefrontAuthMode) => void;
  onOpenChange: (open: boolean) => void;
  onRevealPasswordChange: (value: boolean) => void;
  onSubmit: () => void;
  onSubmitSupportEmail: () => void;
  onSupportModeChange: (mode: StorefrontAuthSupportMode | null) => void;
  onTermsAcceptedChange: (value: boolean) => void;
  setForm: Dispatch<SetStateAction<StorefrontAuthForm>>;
};

export function StorefrontAuthDialog({
  errors,
  form,
  mode,
  notice,
  open,
  product: authProduct,
  revealPassword,
  showErrors,
  state,
  supportMode,
  supportState,
  termsAccepted,
  onContinueWithGoogle,
  onFinish,
  onModeChange,
  onOpenChange,
  onRevealPasswordChange,
  onSubmit,
  onSubmitSupportEmail,
  onSupportModeChange,
  onTermsAcceptedChange,
  setForm,
}: StorefrontAuthDialogProps) {
  const signup = mode === "signup";
  const authenticating = state === "signing-in";
  const busy = authenticating || supportState === "submitting";
  const errorFor = (key: string) => (showErrors ? errors[key] : undefined);

  function setField(key: keyof StorefrontAuthForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "lst-storefront max-h-[calc(100dvh-32px)] gap-0 overflow-y-auto rounded-[28px] border-border/70 bg-card/95 p-0 shadow-[0_34px_110px_rgba(20,29,19,.3)] backdrop-blur-xl",
          authProduct
            ? "max-w-[980px] grid-cols-1 sm:max-w-[980px] md:grid-cols-[minmax(320px,.92fr)_minmax(360px,1.08fr)]"
            : "max-w-[520px] grid-cols-1 sm:max-w-[520px]",
        )}
      >
        <DialogTitle className="sr-only">
          {supportMode
            ? supportMode === "recovery"
              ? "Reset your Laitstyle password"
              : "Resend your Laitstyle confirmation email"
            : signup
              ? "Create a Laitstyle account"
              : "Sign in to Laitstyle"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Access saved pieces, holds, orders and delivery details.
        </DialogDescription>

        {authProduct ? <AuthProductPanel product={authProduct} /> : null}

        <div className="flex min-w-[300px] flex-col p-7 sm:p-9 lg:p-11">
          {state === "success" || state === "check-email" ? (
            <AuthSuccessPanel state={state} onFinish={onFinish} />
          ) : supportMode ? (
            <AuthSupportPanel
              email={form.email}
              emailError={errorFor("email")}
              mode={supportMode}
              notice={notice}
              state={supportState}
              onBack={() => onSupportModeChange(null)}
              onEmailChange={(value) => setField("email", value)}
              onFinish={onFinish}
              onSubmit={onSubmitSupportEmail}
            />
          ) : (
            <div>
              <div className="mb-7">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                  <LockKeyhole className="size-3.5" /> Secure account access
                </div>
                <h2 className="m-0 font-serif text-[34px] font-medium leading-[1.08]">
                  {signup ? "Create your account" : "Welcome back"}
                </h2>
                <p className="m-0 mt-3 text-[14px] leading-6 text-muted-foreground">
                  {signup
                    ? "Join Laitstyle to hold, save and track one-of-one pieces."
                    : "Sign in to pick up your holds, saved pieces and recent orders."}
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-border/75 bg-muted/45 p-1.5">
                <Button
                  aria-pressed={!signup}
                  className="h-10 rounded-xl"
                  disabled={busy}
                  onClick={() => onModeChange("signin")}
                  type="button"
                  variant={!signup ? "default" : "ghost"}
                >
                  Sign in
                </Button>
                <Button
                  aria-pressed={signup}
                  className="h-10 rounded-xl"
                  disabled={busy}
                  onClick={() => onModeChange("signup")}
                  type="button"
                  variant={signup ? "default" : "ghost"}
                >
                  Create account
                </Button>
              </div>

              <Button
                className={`mb-5 w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
                disabled={busy}
                onClick={onContinueWithGoogle}
                size="lg"
                type="button"
                variant="outline"
              >
                <span className="grid size-7 place-items-center rounded-full border border-border bg-card font-semibold">
                  G
                </span>
                Continue with Google
              </Button>

              <div className="mb-5 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">
                  or use email
                </span>
                <Separator className="flex-1" />
              </div>

              <FieldGroup className="gap-[18px]">
                {signup ? (
                  <div className="grid grid-cols-2 gap-[18px] max-sm:grid-cols-1">
                    <AuthField
                      disabled={busy}
                      error={errorFor("first")}
                      label="First name"
                      onChange={(value) => setField("first", value)}
                      placeholder="First name"
                      value={form.first}
                    />
                    <AuthField
                      disabled={busy}
                      error={errorFor("last")}
                      label="Last name"
                      onChange={(value) => setField("last", value)}
                      placeholder="Last name"
                      value={form.last}
                    />
                  </div>
                ) : null}
                <AuthField
                  disabled={busy}
                  error={errorFor("email")}
                  label="Email"
                  onChange={(value) => setField("email", value)}
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                />
                <PasswordField
                  disabled={busy}
                  error={errorFor("password")}
                  label="Password"
                  placeholder={signup ? "At least 8 characters" : "Enter your password"}
                  reveal={revealPassword}
                  value={form.password}
                  onChange={(value) => setField("password", value)}
                  onRevealChange={onRevealPasswordChange}
                />
                {signup ? (
                  <PasswordField
                    disabled={busy}
                    error={errorFor("confirmPassword")}
                    label="Confirm password"
                    placeholder="Enter the password again"
                    reveal={revealPassword}
                    value={form.confirmPassword}
                    onChange={(value) => setField("confirmPassword", value)}
                    onRevealChange={onRevealPasswordChange}
                  />
                ) : null}
              </FieldGroup>

              {errorFor("form") ? (
                <p
                  className="mt-4 rounded-xl border border-destructive/20 bg-destructive-surface px-4 py-3 text-xs leading-5 text-destructive-surface-foreground"
                  role="alert"
                >
                  {errorFor("form")}
                </p>
              ) : null}

              {notice ? (
                <div className="mt-4">
                  <AuthStatusNotice tone={notice.tone}>{notice.message}</AuthStatusNotice>
                </div>
              ) : null}

              {!signup ? (
                <div className="mt-5 flex justify-end">
                  <Button
                    className="h-auto p-0 text-[12px] font-semibold"
                    disabled={busy}
                    onClick={() => onSupportModeChange("recovery")}
                    type="button"
                    variant="link"
                  >
                    Forgot password?
                  </Button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-border/75 bg-muted/35 p-4">
                  <Label className="cursor-pointer items-start text-[12.5px] leading-[1.5] text-muted-foreground">
                    <Checkbox
                      aria-invalid={!!errorFor("terms")}
                      checked={termsAccepted}
                      className="mt-px"
                      disabled={busy}
                      onCheckedChange={(checked) => onTermsAcceptedChange(checked === true)}
                    />
                    I agree to the Terms and Privacy Policy.
                  </Label>
                  {errorFor("terms") ? (
                    <div className="mt-2 text-xs text-destructive">{errorFor("terms")}</div>
                  ) : null}
                </div>
              )}

              <Button
                className={`mt-6 w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
                disabled={busy}
                onClick={onSubmit}
                size="lg"
                type="button"
              >
                {authenticating ? (
                  <span className="size-[18px] rounded-full border-[2.5px] border-current/40 border-t-current animate-spin" />
                ) : null}
                {authenticating
                  ? signup
                    ? "Creating account..."
                    : "Signing in..."
                  : signup
                    ? "Create account"
                    : "Sign in"}
                {!authenticating ? <ArrowRight className="size-4" /> : null}
              </Button>

              <div className="mt-5 text-center text-[13px] text-muted-foreground">
                {signup ? "Already have an account?" : "New to Laitstyle?"}{" "}
                <Button
                  className="h-auto p-0 font-semibold"
                  disabled={busy}
                  onClick={() => onModeChange(signup ? "signin" : "signup")}
                  type="button"
                  variant="link"
                >
                  {signup ? "Sign in" : "Create one"}
                </Button>
              </div>

              {!signup ? (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  Email still unconfirmed?{" "}
                  <Button
                    className="h-auto p-0 font-semibold"
                    disabled={busy}
                    onClick={() => onSupportModeChange("confirmation")}
                    type="button"
                    variant="link"
                  >
                    Send another link
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthProductPanel({ product }: { product: Product }) {
  return (
    <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-sidebar p-9 text-white md:flex">
      <CloudImage
        alt={product.name}
        className="object-cover opacity-90"
        fill
        sizes="440px"
        src={product.images[0]}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,24,18,.22)_0%,rgba(19,24,18,.5)_44%,rgba(19,24,18,.94)_100%)]" />
      <div className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-white/88 backdrop-blur-md">
        <Sparkles className="size-3.5" />
        One account, every find
      </div>
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-white/68">
          Laitstyle account
        </p>
        <div className="mt-4 font-serif text-[36px] leading-[1.03]">
          Keep every find
          <br />
          <em className="font-normal">within reach.</em>
        </div>
        <p className="mt-5 max-w-[350px] text-[13px] leading-6 text-white/72">
          Save one-of-one pieces, keep live holds together and return to your order history without
          rebuilding your bag.
        </p>
        <div className="mt-7 grid gap-3 text-[13px] text-white/88">
          <span className="flex items-center gap-2.5">
            <Check className="size-4 text-[#C8DCA1]" /> Track active holds and reservation timers
          </span>
          <span className="flex items-center gap-2.5">
            <Check className="size-4 text-[#C8DCA1]" /> Save pieces and return when they free up
          </span>
          <span className="flex items-center gap-2.5">
            <Check className="size-4 text-[#C8DCA1]" /> Move through checkout with trusted details
          </span>
        </div>
      </div>
    </div>
  );
}

function AuthSuccessPanel({
  state,
  onFinish,
}: {
  state: Extract<StorefrontAuthState, "success" | "check-email">;
  onFinish: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <div className="mb-6 flex size-[82px] items-center justify-center rounded-full border border-primary/20 bg-primary/10 animate-[leemPop_.5s_cubic-bezier(.33,1,.68,1)]">
        <Check className="size-[36px] text-primary" strokeWidth={2.4} />
      </div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[.24em] text-primary">
        {state === "check-email" ? "Check your email" : "Signed in"}
      </div>
      <h2 className="m-0 font-serif text-[34px] font-medium leading-[1.08]">
        {state === "check-email" ? "Confirm your account." : "You’re back in."}
      </h2>
      <p className="mx-auto mt-4 max-w-[340px] text-[14px] leading-6 text-muted-foreground">
        {state === "check-email"
          ? "If this address can receive a confirmation email, a secure link is on its way. Your guest bag and saved pieces stay in this session."
          : "Your bag, holds, saved pieces and delivery details are ready for the next one-of-one find."}
      </p>
      <Button
        className={`mt-7 w-full max-w-[320px] ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
        onClick={onFinish}
        size="lg"
        type="button"
      >
        {state === "check-email" ? "Continue shopping" : "Go to my account"}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function AuthSupportPanel({
  email,
  emailError,
  mode,
  notice,
  state,
  onBack,
  onEmailChange,
  onFinish,
  onSubmit,
}: {
  email: string;
  emailError?: string;
  mode: StorefrontAuthSupportMode;
  notice: StorefrontAuthNotice | null;
  state: StorefrontAuthSupportState;
  onBack: () => void;
  onEmailChange: (value: string) => void;
  onFinish: () => void;
  onSubmit: () => void;
}) {
  const recovery = mode === "recovery";
  const pending = state === "submitting";

  if (state === "success") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="mb-6 flex size-[82px] items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <MailCheck className="size-[36px] text-primary" strokeWidth={2.2} />
        </div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[.24em] text-primary">
          Email requested
        </div>
        <h2 className="m-0 font-serif text-[34px] font-medium leading-[1.08]">
          Check your inbox.
        </h2>
        <p className="mx-auto mt-4 max-w-[350px] text-[14px] leading-6 text-muted-foreground">
          {recovery
            ? "If this address can receive a reset email, a secure link is on its way. Your bag remains exactly as you left it."
            : "If this address is eligible for confirmation, a fresh link is on its way. Check your inbox and spam folder."}
        </p>
        <div className="mt-7 grid w-full max-w-[340px] gap-3 sm:grid-cols-2">
          <Button onClick={onBack} size="lg" type="button" variant="outline">
            Back to sign in
          </Button>
          <Button
            className={AUTH_PRIMARY_BUTTON_CLASS_NAME}
            onClick={onFinish}
            size="lg"
            type="button"
          >
            Continue shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button
        className="mb-6 h-auto gap-2 p-0 text-[12px] font-semibold"
        disabled={pending}
        onClick={onBack}
        type="button"
        variant="link"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </Button>

      <div className="mb-7">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
          {recovery ? <KeyRound className="size-3.5" /> : <MailCheck className="size-3.5" />}
          {recovery ? "Password recovery" : "Email confirmation"}
        </div>
        <h2 className="m-0 font-serif text-[34px] font-medium leading-[1.08]">
          {recovery ? "Reset your password" : "Send another confirmation"}
        </h2>
        <p className="m-0 mt-3 text-[14px] leading-6 text-muted-foreground">
          {recovery
            ? "Enter your account email and we will send a secure reset link without leaving this page."
            : "Enter the email used during signup and we will send a fresh confirmation link."}
        </p>
      </div>

      <AuthField
        disabled={pending}
        error={emailError}
        label="Email"
        onChange={onEmailChange}
        placeholder="you@example.com"
        type="email"
        value={email}
      />

      {notice ? (
        <div className="mt-4">
          <AuthStatusNotice tone={notice.tone}>{notice.message}</AuthStatusNotice>
        </div>
      ) : null}

      <Button
        className={`mt-6 w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
        disabled={pending}
        onClick={onSubmit}
        size="lg"
        type="button"
      >
        {pending ? "Sending email..." : recovery ? "Send reset link" : "Send confirmation link"}
        {!pending ? <ArrowRight className="size-4" /> : null}
      </Button>
    </div>
  );
}

function PasswordField({
  disabled,
  error,
  label,
  placeholder,
  reveal,
  value,
  onChange,
  onRevealChange,
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  placeholder: string;
  reveal: boolean;
  value: string;
  onChange: (value: string) => void;
  onRevealChange: (value: boolean) => void;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="mb-2 text-[13px] font-semibold">{label}</FieldLabel>
      <div className="relative">
        <Input
          aria-invalid={!!error}
          aria-label={label}
          className={cn(AUTH_INPUT_CLASS_NAME, "pr-12", error && "border-destructive/60")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={reveal ? "text" : "password"}
          value={value}
        />
        <Button
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-2.5 size-9 rounded-lg"
          disabled={disabled}
          onClick={() => onRevealChange(!reveal)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {reveal ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
        </Button>
      </div>
      <FieldError className="mt-1.5 text-xs">{error}</FieldError>
    </Field>
  );
}

function AuthField({
  disabled,
  error,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="mb-2 text-[13px] font-semibold">{label}</FieldLabel>
      <Input
        aria-invalid={!!error}
        aria-label={label}
        className={cn(AUTH_INPUT_CLASS_NAME, error && "border-destructive/60")}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      <FieldError className="mt-1.5 text-xs">{error}</FieldError>
    </Field>
  );
}
