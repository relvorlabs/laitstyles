"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type { AuthPageActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ResetPasswordForm({ action }: { action: AuthPageAction }) {
  const [state, formAction, pending] = useActionState<AuthPageActionState, FormData>(action, {
    status: "idle",
  });
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  if (state.status === "success") {
    return (
      <div className="grid gap-5">
        <AuthStatusNotice tone="success">{state.message}</AuthStatusNotice>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/?auth=signin" />}
            size="lg"
          >
            Sign in with new password
            <ArrowRight className="size-4" />
          </Button>
          <Button
            className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/" />}
            size="lg"
            variant="outline"
          >
            Return to storefront
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

      <form action={formAction} aria-busy={pending} className="grid gap-[18px]" noValidate>
        <AuthField
          error={errors?.password}
          hint="At least 8 characters"
          htmlFor="new-password"
          label="New password"
        >
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-invalid={Boolean(errors?.password)}
              autoComplete="new-password"
              className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
              disabled={pending}
              id="new-password"
              minLength={8}
              name="password"
              placeholder="Create a strong password"
              required
              type="password"
            />
          </div>
        </AuthField>
        <AuthField
          error={errors?.confirmPassword}
          htmlFor="confirm-password"
          label="Confirm new password"
        >
          <Input
            aria-invalid={Boolean(errors?.confirmPassword)}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS_NAME}
            disabled={pending}
            id="confirm-password"
            minLength={8}
            name="confirmPassword"
            placeholder="Enter it again"
            required
            type="password"
          />
        </AuthField>
        <Button
          className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
          disabled={pending}
          size="lg"
          type="submit"
        >
          {pending ? "Updating password…" : "Update password"}
          {!pending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </div>
  );
}
