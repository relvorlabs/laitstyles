"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type { AuthPageActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthField,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";

type AuthPageAction = (
  previousState: AuthPageActionState,
  formData: FormData,
) => Promise<AuthPageActionState>;

type InitialAuthError = {
  code: Extract<AuthPageActionState, { status: "error" }>["code"];
  message: string;
};

export function SignInForm({
  action,
  next,
  initialError,
}: {
  action: AuthPageAction;
  next: string;
  initialError?: InitialAuthError;
}) {
  const initialState: AuthPageActionState = initialError
    ? { status: "error", ...initialError }
    : { status: "idle" };
  const [state, formAction, pending] = useActionState(action, initialState);
  const emailError = state.status === "error" ? state.fieldErrors?.email : undefined;
  const passwordError = state.status === "error" ? state.fieldErrors?.password : undefined;
  const returnTo = `/auth/sign-in?next=${encodeURIComponent(next)}`;

  return (
    <div className="grid gap-6">
      {state.status === "error" ? (
        <AuthStatusNotice tone="error">{state.message}</AuthStatusNotice>
      ) : null}

      <form action="/auth/google" method="post">
        <input name="next" type="hidden" value={next} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <Button
          className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
          disabled={pending}
          size="lg"
          type="submit"
          variant="outline"
        >
          <span className="grid size-7 place-items-center rounded-full border border-border bg-card font-semibold">
            G
          </span>
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <Separator className="flex-1" />
        or use email
        <Separator className="flex-1" />
      </div>

      <form action={formAction} aria-busy={pending} className="grid gap-[18px]" noValidate>
        <input name="next" type="hidden" value={next} />
        <AuthField error={emailError} htmlFor="auth-email" label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-invalid={Boolean(emailError)}
              autoComplete="email"
              className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
              defaultValue={state.values?.email}
              disabled={pending}
              id="auth-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
        </AuthField>

        <AuthField error={passwordError} htmlFor="auth-password" label="Password">
          <Input
            aria-invalid={Boolean(passwordError)}
            autoComplete="current-password"
            className={AUTH_INPUT_CLASS_NAME}
            disabled={pending}
            id="auth-password"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
        </AuthField>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link
            className="font-semibold text-foreground underline-offset-4 hover:underline"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
          <Link
            className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/auth/resend-confirmation"
          >
            Resend confirmation
          </Link>
        </div>

        <Button
          className={`mt-1 w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
          disabled={pending}
          size="lg"
          type="submit"
        >
          {pending ? "Signing in…" : "Sign in to workspace"}
          {!pending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </div>
  );
}
