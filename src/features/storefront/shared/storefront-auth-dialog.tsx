"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { cn } from "@/lib/utils";

export type StorefrontAuthMode = "signin" | "signup";
export type StorefrontAuthState = "default" | "signing-in" | "success" | "check-email";
export type StorefrontAuthForm = {
  first: string;
  last: string;
  email: string;
  password: string;
};

type StorefrontAuthDialogProps = {
  errors: Record<string, string>;
  form: StorefrontAuthForm;
  mode: StorefrontAuthMode;
  open: boolean;
  product: Product | undefined;
  remember: boolean;
  revealPassword: boolean;
  showErrors: boolean;
  state: StorefrontAuthState;
  termsAccepted: boolean;
  onContinueWithGoogle: () => void;
  onFinish: () => void;
  onModeChange: (mode: StorefrontAuthMode) => void;
  onOpenChange: (open: boolean) => void;
  onRememberChange: (value: boolean) => void;
  onRevealPasswordChange: (value: boolean) => void;
  onSubmit: () => void;
  onTermsAcceptedChange: (value: boolean) => void;
  setForm: Dispatch<SetStateAction<StorefrontAuthForm>>;
};

export function StorefrontAuthDialog({
  errors,
  form,
  mode,
  open,
  product: authProduct,
  remember,
  revealPassword,
  showErrors,
  state,
  termsAccepted,
  onContinueWithGoogle,
  onFinish,
  onModeChange,
  onOpenChange,
  onRememberChange,
  onRevealPasswordChange,
  onSubmit,
  onTermsAcceptedChange,
  setForm,
}: StorefrontAuthDialogProps) {
  if (!authProduct) return null;
  const signup = mode === "signup";
  const busy = state === "signing-in";
  const errorFor = (key: string) => (showErrors ? errors[key] : undefined);

  function setField(key: keyof StorefrontAuthForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[calc(100vh-64px)] max-w-[940px] grid-cols-1 gap-0 overflow-y-auto rounded-lg p-0 shadow-[0_30px_80px_rgba(0,0,0,.24)] sm:max-w-[940px] md:grid-cols-[minmax(300px,1fr)_minmax(320px,1.2fr)]"
      >
        <DialogTitle className="sr-only">Sign in</DialogTitle>
        <DialogDescription className="sr-only">Access your Laitstyle account.</DialogDescription>
        <div className="relative hidden min-h-[540px] flex-col justify-end overflow-hidden bg-[linear-gradient(160deg,#5A6152,#3E463A)] p-9 text-white md:flex">
          <Image
            alt={authProduct.name}
            className="object-cover opacity-90"
            fill
            sizes="420px"
            src={authProduct.images[0]}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,36,27,.35)_0%,rgba(30,36,27,.82)_100%)]" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="size-[7px] rounded-full bg-[#B8CE8E] animate-[leemPulse_1.8s_ease-in-out_infinite]" />
              <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/85">
                Second-hand, first choice
              </span>
            </div>
            <div className="mb-3.5 font-serif text-[30px] leading-[1.1]">
              Your account keeps
              <br />
              <em className="font-normal">every find within reach.</em>
            </div>
            <div className="mt-5 flex flex-col gap-3 text-[13px] text-white/90">
              <span>Track live holds &amp; reservation timers</span>
              <span>Save pieces &amp; get freed-up alerts</span>
              <span>Faster checkout on future drops</span>
            </div>
          </div>
        </div>
        <div className="flex min-w-[300px] flex-col p-10 max-sm:p-6">
          {state === "success" || state === "check-email" ? (
            <div className="flex flex-1 flex-col items-center justify-center py-5 text-center">
              <div className="mb-[22px] flex size-[76px] items-center justify-center rounded-full border border-[#CFDCB4] bg-[#EAF0DD] animate-[leemPop_.5s_cubic-bezier(.33,1,.68,1)]">
                <Check className="size-[34px] text-[#5F7043]" strokeWidth={2.4} />
              </div>
              <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[.28em] text-accent">
                {state === "check-email" ? "Check your email" : "Signed in"}
              </div>
              <h2 className="m-0 mb-2.5 font-serif text-[30px] font-medium leading-[1.15]">
                {state === "check-email" ? "Confirm your account." : "You&apos;re in."}
              </h2>
              <p className="mx-auto m-0 mb-[26px] max-w-[320px] text-sm leading-[1.6] text-muted-foreground">
                {state === "check-email"
                  ? "If this address can receive a confirmation email, a secure link is on its way. Your guest bag and saved pieces will stay in this session."
                  : "Your holds, saved pieces and addresses are ready. Let&apos;s find the next one-of-one."}
              </p>
              <Button size="lg" className="w-full max-w-[300px]" onClick={onFinish}>
                {state === "check-email" ? "Continue shopping" : "Go to my account"}
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="m-0 mb-1.5 font-serif text-[28px] font-medium leading-[1.1]">
                {signup ? "Create your account" : "Welcome back"}
              </h2>
              <p className="m-0 mb-[22px] text-[13.5px] text-[#8A887E]">
                {signup
                  ? "Join Laitstyle to hold, save and track one-of-one pieces."
                  : "Sign in to pick up your holds and saved finds."}
              </p>
              <div className="mb-6 flex gap-1 rounded-full border border-border bg-[#F2F1EC] p-1">
                <Button
                  aria-pressed={!signup}
                  className="flex-1"
                  onClick={() => onModeChange("signin")}
                  type="button"
                  variant={!signup ? "default" : "ghost"}
                >
                  Sign in
                </Button>
                <Button
                  aria-pressed={signup}
                  className="flex-1"
                  onClick={() => onModeChange("signup")}
                  type="button"
                  variant={signup ? "default" : "ghost"}
                >
                  Create account
                </Button>
              </div>
              <Button
                size="lg"
                className="mb-5 w-full"
                onClick={onContinueWithGoogle}
                variant="outline"
              >
                Continue with Google
              </Button>
              <div className="mb-5 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-[11.5px] tracking-[.06em] text-[#A7A59B]">or use email</span>
                <Separator className="flex-1" />
              </div>
              <FieldGroup className="gap-3">
                {signup ? (
                  <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    <AuthField
                      error={errorFor("first")}
                      label="First name"
                      onChange={(value) => setField("first", value)}
                      placeholder="First name"
                      value={form.first}
                    />
                    <AuthField
                      error={errorFor("last")}
                      label="Last name"
                      onChange={(value) => setField("last", value)}
                      placeholder="Last name"
                      value={form.last}
                    />
                  </div>
                ) : null}
                <AuthField
                  error={errorFor("email")}
                  label="Email"
                  onChange={(value) => setField("email", value)}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                />
                <Field data-invalid={!!errorFor("password")}>
                  <div className="relative">
                    <Input
                      aria-invalid={!!errorFor("password")}
                      aria-label="Password"
                      className={cn(
                        "h-[52px] rounded-[9px] bg-card px-[15px] pr-11 text-sm focus-visible:border-primary focus-visible:ring-0",
                        errorFor("password") ? "border-[#D98B84]" : "border-input",
                      )}
                      onChange={(event) => setField("password", event.target.value)}
                      placeholder="Password"
                      type={revealPassword ? "text" : "password"}
                      value={form.password}
                    />
                    <Button
                      aria-label={revealPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-2.5"
                      onClick={() => onRevealPasswordChange(!revealPassword)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      {revealPassword ? (
                        <Eye className="size-[18px]" />
                      ) : (
                        <EyeOff className="size-[18px]" />
                      )}
                    </Button>
                  </div>
                  <FieldError className="mt-1.5 text-xs">{errorFor("password")}</FieldError>
                </Field>
              </FieldGroup>
              {errorFor("form") ? (
                <p
                  className="mt-3 rounded-md bg-destructive-surface px-3 py-2 text-xs text-destructive-surface-foreground"
                  role="alert"
                >
                  {errorFor("form")}
                </p>
              ) : null}
              {!signup ? (
                <div className="mt-4 flex items-center justify-between gap-2.5">
                  <Label className="cursor-pointer text-[13px] text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(checked) => onRememberChange(checked === true)}
                    />
                    Keep me signed in
                  </Label>
                  <Link
                    className="text-[12px] font-semibold text-foreground underline-offset-4 hover:underline"
                    href="/auth/forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : (
                <div className="mt-4">
                  <Label className="cursor-pointer items-start text-[12.5px] leading-[1.45] text-muted-foreground">
                    <Checkbox
                      aria-invalid={!!errorFor("terms")}
                      checked={termsAccepted}
                      className="mt-px"
                      onCheckedChange={(checked) => onTermsAcceptedChange(checked === true)}
                    />
                    I agree to the Terms and Privacy Policy.
                  </Label>
                  {errorFor("terms") ? (
                    <div className="mt-1.5 text-xs text-destructive">{errorFor("terms")}</div>
                  ) : null}
                </div>
              )}
              <Button size="lg" className="mt-[22px] w-full" disabled={busy} onClick={onSubmit}>
                {busy ? (
                  <span className="size-[18px] rounded-full border-[2.5px] border-current/40 border-t-current animate-spin" />
                ) : null}
                {busy
                  ? signup
                    ? "Creating account..."
                    : "Signing in..."
                  : signup
                    ? "Create account"
                    : "Sign in"}
              </Button>
              <div className="mt-4 text-center text-[13px] text-[#8A887E]">
                {signup ? "Already have an account?" : "New to Laitstyle?"}{" "}
                <Button
                  size="lg"
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
                  <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/auth/resend-confirmation">
                    Send another link
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthField({
  error,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="sr-only">{label}</FieldLabel>
      <Input
        aria-invalid={!!error}
        aria-label={label}
        className={cn(
          "h-[52px] rounded-[9px] bg-card px-[15px] text-sm focus-visible:border-primary focus-visible:ring-0",
          error ? "border-[#D98B84]" : "border-input",
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      <FieldError className="mt-1.5 text-xs">{error}</FieldError>
    </Field>
  );
}
