import { ArrowRight, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { submitRecoveredPasswordWithRedirect } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
} from "@/modules/auth/server/diagnostics";
import { hasRecoverySession } from "@/modules/auth/server/authenticate";
import { withAuthErrorPath } from "@/modules/auth/server/redirects";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AuthField,
  AuthPageShell,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";

export const metadata: Metadata = {
  title: "Choose a new password | Laitstyle",
  description: "Complete a secure Laitstyle password recovery.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ updated?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  if (params.updated === "1") {
    return (
      <AuthPageShell
        description="Your password has been changed and other sessions have been closed. Sign in again with the password you just chose."
        eyebrow="Password updated"
        highlights={[
          "New password saved to your Supabase identity",
          "Existing sessions closed after recovery",
          "Storefront data remains attached to your account",
        ]}
        sideDescription="Your account is ready again. Sign in with the new password and continue with the same saved pieces, orders and delivery details."
        sideTitle="You are securely back in control."
        title="Your new password is ready"
      >
        <div className="grid gap-5">
          <AuthStatusNotice tone="success">
            Password replacement completed successfully. Use your new password for the next sign-in.
          </AuthStatusNotice>
          <Button
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/?auth=signin" />}
            size="lg"
          >
            Sign in with new password
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </AuthPageShell>
    );
  }

  if (!(await hasRecoverySession())) {
    redirect(withAuthErrorPath("recovery-invalid", "/auth/forgot-password"));
  }

  const error = isAuthFlowErrorCode(params.error) ? getAuthFlowErrorMessage(params.error) : null;

  return (
    <AuthPageShell
      description="Choose a strong replacement password. After the update, other sessions are signed out so the recovered account starts cleanly."
      eyebrow="Secure recovery"
      footer={
        <Link
          className="text-[13px] font-semibold text-foreground underline-offset-4 hover:underline"
          href="/auth/forgot-password"
        >
          Request a different reset link
        </Link>
      }
      highlights={[
        "Recovery session verified before the form is shown",
        "Password policy enforced by the app and Supabase",
        "Other sessions closed after a successful update",
      ]}
      sideDescription="The recovery link establishes a temporary secure session. Once the password changes, that session is closed and your account returns to its normal protected state."
      sideTitle="Replace the key, keep the account."
      title="Choose a new password"
    >
      <div className="grid gap-6">
        {error ? <AuthStatusNotice tone="error">{error}</AuthStatusNotice> : null}

        <form action={submitRecoveredPasswordWithRedirect} className="grid gap-[18px]">
          <AuthField htmlFor="new-password" hint="At least 8 characters" label="New password">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="new-password"
                className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
                id="new-password"
                minLength={8}
                name="password"
                placeholder="Create a strong password"
                required
                type="password"
              />
            </div>
          </AuthField>
          <AuthField htmlFor="confirm-password" label="Confirm new password">
            <Input
              autoComplete="new-password"
              className={AUTH_INPUT_CLASS_NAME}
              id="confirm-password"
              minLength={8}
              name="confirmPassword"
              placeholder="Enter it again"
              required
              type="password"
            />
          </AuthField>
          <Button className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`} size="lg" type="submit">
            Update password
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
