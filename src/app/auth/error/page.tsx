import { ArrowLeft, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/modules/auth/server/diagnostics";
import { getSafeNextPath } from "@/modules/auth/server/redirects";
import {
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthPageShell,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";

export const metadata: Metadata = {
  title: "Authentication issue | Laitstyle",
  description: "Recover from a Laitstyle authentication problem.",
};

type AuthErrorPageProps = {
  searchParams: Promise<{
    code?: string;
    next?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const next = getSafeNextPath(params.next, "/account");
  const code = isAuthFlowErrorCode(params.code) ? params.code : null;
  const message = code
    ? getAuthFlowErrorMessage(code)
    : "We could not complete that authentication request.";
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(next)}`;
  const recoveryHref =
    code === "email-not-confirmed"
      ? "/auth/resend-confirmation"
      : code === "recovery-invalid" || code === "password-update-failed"
        ? "/auth/forgot-password"
        : null;

  return (
    <AuthPageShell
      description="Nothing has been changed on your account. Choose the safest next step below and we will return you to the correct authentication flow."
      eyebrow="Authentication issue"
      highlights={[
        "Provider details are never exposed in the browser",
        "Return paths are restricted to Laitstyle routes",
        "Recovery links remain available when needed",
      ]}
      sideDescription="Authentication errors should explain the next useful action without exposing provider internals or leaving you on a dead-end page."
      sideTitle="A safe route forward, even when sign-in stops."
      title="We could not finish that request"
    >
      <div className="grid gap-6">
        <AuthStatusNotice tone="error">{message}</AuthStatusNotice>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href={signInHref} />}
            size="lg"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Button>

          {recoveryHref ? (
            <Button
              className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
              nativeButton={false}
              render={<Link href={recoveryHref} />}
              size="lg"
              variant="outline"
            >
              <RotateCcw className="size-4" />
              {code === "email-not-confirmed" ? "Resend confirmation" : "New reset link"}
            </Button>
          ) : (
            <Button
              className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
              nativeButton={false}
              render={<Link href="/" />}
              size="lg"
              variant="outline"
            >
              Return to storefront
            </Button>
          )}
        </div>
      </div>
    </AuthPageShell>
  );
}
