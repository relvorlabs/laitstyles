import type { Metadata } from "next";
import Link from "next/link";
import { resendSignupConfirmationWithRedirect } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/lib/auth/auth-errors";

export const metadata: Metadata = {
  title: "Resend confirmation | Laitstyle",
  description: "Request another Supabase email-confirmation link.",
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
    <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[520px] gap-6 rounded-lg p-6 shadow-laitstyle sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Email confirmation
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium">Need another confirmation link?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Enter the address used during signup. The response remains private even when the address
            is not registered.
          </p>
        </div>

        {params.sent === "1" ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6">
            If this address is eligible for confirmation, a fresh link is on its way. Check your
            inbox and spam folder.
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-lg bg-destructive-surface p-4 text-sm text-destructive-surface-foreground"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <form action={resendSignupConfirmationWithRedirect} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="confirmation-email">
            Email
            <Input
              autoComplete="email"
              id="confirmation-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <Button size="lg" type="submit">
            Send confirmation link
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link className="font-semibold underline-offset-4 hover:underline" href="/?auth=signin">
            Back to sign in
          </Link>
          <Link
            className="text-muted-foreground underline-offset-4 hover:underline"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      </Card>
    </main>
  );
}
