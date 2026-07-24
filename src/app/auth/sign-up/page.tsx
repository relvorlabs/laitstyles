import type { Metadata } from "next";
import Link from "next/link";
import { signUpWithPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Create account | Laitstyle",
  description: "Create a Laitstyle customer account.",
};

type SignUpPageProps = {
  searchParams: Promise<{ sent?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { sent } = await searchParams;

  return (
    <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[560px] gap-6 rounded-lg p-6 shadow-laitstyle sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Customer account
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Save pieces, keep delivery details and follow every order from one secure account.
          </p>
        </div>

        {sent === "1" ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-6">
            If this address can receive a confirmation email, a secure link is on its way. Check
            your inbox and spam folder before requesting another one.
          </div>
        ) : null}

        <form action="/auth/google" method="post">
          <input name="next" type="hidden" value="/account" />
          <Button className="w-full" size="lg" type="submit">
            Continue with Google
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          or use email
          <Separator className="flex-1" />
        </div>

        <form action={signUpWithPassword} className="grid gap-4">
          <input name="next" type="hidden" value="/account" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="signup-first">
              First name
              <Input autoComplete="given-name" id="signup-first" name="first" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="signup-last">
              Last name
              <Input autoComplete="family-name" id="signup-last" name="last" required />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="signup-email">
            Email
            <Input autoComplete="email" id="signup-email" name="email" required type="email" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="signup-password">
            Password
            <Input
              autoComplete="new-password"
              id="signup-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input className="mt-1 size-4" name="terms" required type="checkbox" value="true" />
            <span>I agree to the Terms and Privacy Policy.</span>
          </label>
          <Button size="lg" type="submit">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            className="font-semibold text-foreground underline-offset-4 hover:underline"
            href="/?auth=signin"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
