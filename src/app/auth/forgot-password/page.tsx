import { ArrowRight, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetWithRedirect } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/modules/auth/server/diagnostics";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AuthField,
  AuthPageShell,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";

export const metadata: Metadata = {
  title: "Reset password | Laitstyle",
  description: "Request a secure Laitstyle password-reset link.",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = isAuthFlowErrorCode(params.error) ? getAuthFlowErrorMessage(params.error) : null;

  return (
    <AuthPageShell
      description="Enter the email attached to your account. We keep the response private, whether or not the address is registered."
      eyebrow="Account recovery"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/?auth=signin">
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
      <div className="grid gap-6">
        {params.sent === "1" ? (
          <AuthStatusNotice tone="success">
            If this address can receive a reset email, a secure link is on its way. Check your inbox and spam folder.
          </AuthStatusNotice>
        ) : null}

        {error ? <AuthStatusNotice tone="error">{error}</AuthStatusNotice> : null}

        <form action={requestPasswordResetWithRedirect} className="grid gap-[18px]">
          <AuthField htmlFor="recovery-email" label="Email address">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="email"
                className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
                id="recovery-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
          </AuthField>
          <Button className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`} size="lg" type="submit">
            Send secure reset link
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
