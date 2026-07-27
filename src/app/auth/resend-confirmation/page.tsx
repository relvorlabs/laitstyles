import type { Metadata } from "next";
import Link from "next/link";
import { resendSignupConfirmationWithRedirect } from "@/app/auth/actions";
import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
} from "@/modules/auth/server/diagnostics";
import { AuthEmailForm } from "@/modules/auth/ui/auth-email-form";
import { AuthPageShell } from "@/modules/auth/ui/auth-page-shell";

export const metadata: Metadata = {
  title: "Resend confirmation | Laitstyle",
  description: "Request another Laitstyle account-confirmation link.",
};

type ResendConfirmationPageProps = {
  searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function ResendConfirmationPage({
  searchParams,
}: ResendConfirmationPageProps) {
  const params = await searchParams;
  const errorCode = isAuthFlowErrorCode(params.error) ? params.error : null;

  return (
    <AuthPageShell
      description="Enter the address used during signup and we will send a fresh confirmation email using the template configured for this project."
      eyebrow="Email confirmation"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link
            className="font-semibold text-foreground underline-offset-4 hover:underline"
            href="/?auth=signin"
          >
            Back to sign in
          </Link>
          <Link
            className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      }
      highlights={[
        "Fresh signup-confirmation request",
        "Safe response for registered and unknown addresses",
        "Confirmation returns to the account flow you started",
      ]}
      sideDescription="Confirmation emails should take you back to the correct account flow, not a dead end. The callback address is resolved from one configured application origin."
      sideTitle="Finish setting up your account."
      title="Send another confirmation link"
    >
      <AuthEmailForm
        action={resendSignupConfirmationWithRedirect}
        initialEmail={params.email}
        initialError={
          errorCode ? { code: errorCode, message: getAuthFlowErrorMessage(errorCode) } : undefined
        }
        kind="confirmation"
      />
    </AuthPageShell>
  );
}
