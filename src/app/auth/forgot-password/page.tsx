import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetWithRedirect } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/lib/auth/auth-errors";

export const metadata: Metadata = {
  title: "Reset password | Laitstyle",
  description: "Request a secure Laitstyle password-reset link.",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = isAuthFlowErrorCode(params.error)
    ? getAuthFlowErrorMessage(params.error)
    : null;

  return (
    <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[520px] gap-6 rounded-lg p-6 shadow-laitstyle sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Account recovery
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium">Forgot your password?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Enter the email used for your account. For privacy, the response is the same whether
            or not an account exists.
          </p>
        </div>

        {params.sent === "1" ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6">
            If this address can receive a reset email, a secure link is on its way. Check your
            inbox and spam folder.
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-destructive-surface p-4 text-sm text-destructive-surface-foreground" role="alert">
            {error}
          </p>
        ) : null}

        <form action={requestPasswordResetWithRedirect} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="recovery-email">
            Email
            <Input
              autoComplete="email"
              id="recovery-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <Button size="lg" type="submit">
            Send reset link
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link className="font-semibold underline-offset-4 hover:underline" href="/?auth=signin">
            Back to sign in
          </Link>
          <Link className="text-muted-foreground underline-offset-4 hover:underline" href="/auth/resend-confirmation">
            Resend confirmation
          </Link>
        </div>
      </Card>
    </main>
  );
}
