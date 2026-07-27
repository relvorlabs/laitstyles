import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetWithRedirect } from "@/app/auth/actions";
import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
} from "@/modules/auth/server/diagnostics";
import { AuthEmailForm } from "@/modules/auth/ui/auth-email-form";
import { AuthPageShell } from "@/modules/auth/ui/auth-page-shell";

export const metadata: Metadata = {
  title: "Reset password | Laitstyle",
  description: "Request a secure Laitstyle password-reset link.",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; email?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const errorCode = isAuthFlowErrorCode(params.error) ? params.error : null;

  return (
    <AuthPageShell
      description="Enter the email attached to your account. We keep the response private, whether or not the address is registered."
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
            Resend confirmation
          </Link>
        </div>
      }
      highlights={[
        "Private, enumeration-safe recovery response",
        "Single-use link through your configured Supabase email",
        "Other sessions are closed after password replacement",
      ]}
      sideDescription="Recovery should feel calm, not confusing. We send a secure, single-use path back to your account without revealing whether an address is registered."
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
