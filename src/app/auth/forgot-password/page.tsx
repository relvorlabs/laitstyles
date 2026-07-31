import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetWithRedirect } from "@/app/auth/actions";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/modules/auth/server/diagnostics";
import { AuthEmailForm } from "@/modules/auth/ui/auth-email-form";
import { AuthPageShell } from "@/modules/auth/ui/auth-page-shell";

export const metadata: Metadata = {
  title: "Reset password | Laitstyle",
  description: "Request a Laitstyle password-reset link.",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const errorCode = isAuthFlowErrorCode(params.error) ? params.error : null;

  return (
    <AuthPageShell
      description="Enter the email you use for Laitstyle and we will send you a link to choose a new password."
      eyebrow="Account recovery"
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
            href="/auth/resend-confirmation"
          >
            Resend confirmation email
          </Link>
        </div>
      }
      highlights={[
        "A private response that protects your account",
        "A secure link sent to your email",
        "Other devices are signed out after your password changes",
      ]}
      sideDescription="We will guide you back to your account without revealing private account details."
      sideTitle="A clear way back into your account."
      title="Forgot your password?"
    >
      <AuthEmailForm
        action={requestPasswordResetWithRedirect}
        initialEmail={params.email}
        initialError={
          errorCode ? { code: errorCode, message: getAuthFlowErrorMessage(errorCode) } : undefined
        }
        kind="recovery"
      />
    </AuthPageShell>
  );
}
