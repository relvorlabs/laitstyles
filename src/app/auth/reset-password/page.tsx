import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { submitRecoveredPasswordWithRedirect } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { hasRecoverySession } from "@/modules/auth/server/authenticate";
import { getAuthFlowErrorMessage } from "@/modules/auth/server/diagnostics";
import {
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthPageShell,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";
import { ResetPasswordForm } from "@/modules/auth/ui/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password | Laitstyle",
  description: "Complete a secure Laitstyle password recovery.",
};

export default async function ResetPasswordPage() {
  const recoverySessionAvailable = await hasRecoverySession();

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
      {recoverySessionAvailable ? (
        <ResetPasswordForm action={submitRecoveredPasswordWithRedirect} />
      ) : (
        <div className="grid gap-5">
          <AuthStatusNotice tone="error">
            {getAuthFlowErrorMessage("recovery-invalid")}
          </AuthStatusNotice>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
              nativeButton={false}
              render={<Link href="/auth/forgot-password" />}
              size="lg"
            >
              Request a new link
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
      )}
    </AuthPageShell>
  );
}
