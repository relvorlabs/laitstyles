"use client";

import { ArrowRight, Mail, MailCheck } from "lucide-react";
import { useActionState } from "react";
import type { AuthPageActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
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

export function AuthEmailForm({
  action,
  initialEmail,
  initialError,
  kind,
}: {
  action: AuthPageAction;
  initialEmail?: string;
  initialError?: InitialAuthError;
  kind: "confirmation" | "recovery";
}) {
  const initialState: AuthPageActionState = initialError
    ? { status: "error", values: { email: initialEmail }, ...initialError }
    : { status: "idle", values: { email: initialEmail } };
  const [state, formAction, pending] = useActionState(action, initialState);
  const emailError = state.status === "error" ? state.fieldErrors?.email : undefined;
  const retainedValues = state.status === "success" ? undefined : state.values;
  const Icon = kind === "confirmation" ? MailCheck : Mail;
  const buttonLabel =
    kind === "confirmation" ? "Send confirmation email" : "Send secure reset link";

  return (
    <div className="grid gap-6">
      {state.status === "success" ? (
        <AuthStatusNotice tone="success">{state.message}</AuthStatusNotice>
      ) : null}
      {state.status === "error" ? (
        <AuthStatusNotice tone="error">{state.message}</AuthStatusNotice>
      ) : null}

      <form action={formAction} aria-busy={pending} className="grid gap-[18px]" noValidate>
        <AuthField error={emailError} htmlFor={`${kind}-email`} label="Email address">
          <div className="relative">
            <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-invalid={Boolean(emailError)}
              autoComplete="email"
              className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
              defaultValue={retainedValues?.email ?? initialEmail}
              disabled={pending}
              id={`${kind}-email`}
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
        </AuthField>
        <Button
          className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
          disabled={pending}
          size="lg"
          type="submit"
        >
          {pending ? "Sending…" : state.status === "success" ? "Send again" : buttonLabel}
          {!pending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </div>
  );
}
