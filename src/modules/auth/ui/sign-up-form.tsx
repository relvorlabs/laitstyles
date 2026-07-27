"use client";

import { ArrowRight, Mail, UserRound } from "lucide-react";
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

export function SignUpForm({
  action,
  initialError,
}: {
  action: AuthPageAction;
  initialError?: InitialAuthError;
}) {
  const initialState: AuthPageActionState = initialError
    ? { status: "error", ...initialError }
    : { status: "idle" };
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  if (state.status === "success") {
    return (
      <div className="grid gap-5">
        <AuthStatusNotice tone="success">{state.message}</AuthStatusNotice>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/" />}
            size="lg"
          >
            Continue shopping
            <ArrowRight className="size-4" />
          </Button>
          <Button
            className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/auth/resend-confirmation" />}
            size="lg"
            variant="outline"
          >
            Send another link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {state.status === "error" ? (
        <AuthStatusNotice tone="error">{state.message}</AuthStatusNotice>
      ) : null}

      <form action="/auth/google" method="post">
        <input name="next" type="hidden" value="/account" />
        <input name="returnTo" type="hidden" value="/auth/sign-up" />
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
        <input name="next" type="hidden" value="/account" />
        <input name="returnTo" type="hidden" value="/auth/sign-up" />

        <div className="grid gap-[18px] sm:grid-cols-2">
          <AuthField error={errors?.first} htmlFor="signup-first" label="First name">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-invalid={Boolean(errors?.first)}
                autoComplete="given-name"
                className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
                defaultValue={state.values?.first}
                disabled={pending}
                id="signup-first"
                name="first"
                placeholder="First name"
                required
              />
            </div>
          </AuthField>
          <AuthField error={errors?.last} htmlFor="signup-last" label="Last name">
            <Input
              aria-invalid={Boolean(errors?.last)}
              autoComplete="family-name"
              className={AUTH_INPUT_CLASS_NAME}
              defaultValue={state.values?.last}
              disabled={pending}
              id="signup-last"
              name="last"
              placeholder="Last name"
              required
            />
          </AuthField>
        </div>

        <AuthField error={errors?.email} htmlFor="signup-email" label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-invalid={Boolean(errors?.email)}
              autoComplete="email"
              className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
              defaultValue={state.values?.email}
              disabled={pending}
              id="signup-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
        </AuthField>

        <AuthField
          error={errors?.password}
          hint="At least 8 characters"
          htmlFor="signup-password"
          label="Password"
        >
          <Input
            aria-invalid={Boolean(errors?.password)}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS_NAME}
            disabled={pending}
            id="signup-password"
            minLength={8}
            name="password"
            placeholder="Create a strong password"
            required
            type="password"
          />
        </AuthField>

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/75 bg-muted/35 p-4 text-[13px] leading-5 text-muted-foreground">
            <input
              aria-invalid={Boolean(errors?.terms)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
              defaultChecked={state.values?.termsAccepted}
              disabled={pending}
              name="terms"
              required
              type="checkbox"
              value="true"
            />
            <span>
              I agree to the Terms and Privacy Policy and understand that my account is used for
              orders, saved pieces and delivery details.
            </span>
          </label>
          {errors?.terms ? (
            <p className="mt-2 text-xs font-medium text-destructive" role="alert">
              {errors.terms}
            </p>
          ) : null}
        </div>

        <Button
          className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
          disabled={pending}
          size="lg"
          type="submit"
        >
          {pending ? "Creating account…" : "Create my account"}
          {!pending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="text-center text-[13px] text-muted-foreground">
        Already registered?{" "}
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:underline"
          href="/?auth=signin"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
