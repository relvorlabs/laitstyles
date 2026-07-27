import { ArrowRight, MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { resendSignupConfirmationWithRedirect } from "@/app/auth/actions";
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
  title: "Resend confirmation | Laitstyle",
  description: "Request another Laitstyle account-confirmation link.",
};

type ResendConfirmationPageProps = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ResendConfirmationPage({
  searchParams,
}: ResendConfirmationPageProps) {
  const params = await searchParams;
  const error = isAuthFlowErrorCode(params.error) ? getAuthFlowErrorMessage(params.error) : null;

  return (
    <AuthPageShell
      description="Enter the address used during signup and we will ask Supabase to send a fresh confirmation email using the template configured for this project."
      eyebrow="Email confirmation"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/?auth=signin">
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
        "Redirects return to the correct Laitstyle account route",
      ]}
      sideDescription="Confirmation emails should take you back to the correct account flow, not a dead end. The callback address is now resolved from one configured application origin."
      sideTitle="Finish setting up your account."
      title="Send another confirmation link"
    >
      <div className="grid gap-6">
        {params.sent === "1" ? (
          <AuthStatusNotice tone="success">
            If this address is eligible for confirmation, a fresh link is on its way. Check your inbox and spam folder.
          </AuthStatusNotice>
        ) : null}

        {error ? <AuthStatusNotice tone="error">{error}</AuthStatusNotice> : null}

        <form action={resendSignupConfirmationWithRedirect} className="grid gap-[18px]">
          <AuthField htmlFor="confirmation-email" label="Email address">
            <div className="relative">
              <MailCheck className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="email"
                className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
                id="confirmation-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>
          </AuthField>
          <Button className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`} size="lg" type="submit">
            Send confirmation email
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
