import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { submitRecoveredPasswordWithRedirect } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/lib/auth/auth-errors";
import { withAuthErrorPath } from "@/lib/auth/server/redirects";
import { createClient } from "@/lib/supabase/server";

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
      <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-[520px] gap-5 rounded-lg p-6 text-center shadow-laitstyle sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Password updated
          </p>
          <h1 className="font-serif text-4xl font-medium">Your new password is ready.</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Other sessions were signed out. Sign in again with the password you just chose.
          </p>
          <Button nativeButton={false} render={<Link href="/?auth=signin" />} size="lg">
            Sign in
          </Button>
        </Card>
      </main>
    );
  }

  const supabase = await createClient();
  const { data, error: sessionError } = await supabase.auth.getUser();
  if (!data.user || sessionError) {
    redirect(withAuthErrorPath("recovery-invalid", "/auth/forgot-password"));
  }

  const error = isAuthFlowErrorCode(params.error)
    ? getAuthFlowErrorMessage(params.error)
    : null;

  return (
    <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[520px] gap-6 rounded-lg p-6 shadow-laitstyle sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Secure recovery
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium">Choose a new password</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use at least eight characters. Supabase may require a stronger password according to
            the project password policy.
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive-surface p-4 text-sm text-destructive-surface-foreground" role="alert">
            {error}
          </p>
        ) : null}

        <form action={submitRecoveredPasswordWithRedirect} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="new-password">
            New password
            <Input
              autoComplete="new-password"
              id="new-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="confirm-password">
            Confirm new password
            <Input
              autoComplete="new-password"
              id="confirm-password"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          <Button size="lg" type="submit">
            Update password
          </Button>
        </form>

        <Link className="text-sm font-semibold underline-offset-4 hover:underline" href="/auth/forgot-password">
          Request a different reset link
        </Link>
      </Card>
    </main>
  );
}
