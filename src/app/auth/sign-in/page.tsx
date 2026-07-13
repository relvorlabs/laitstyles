import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithPassword } from "@/app/auth/actions";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getSafeNextPath } from "@/lib/auth/server/redirects";
import { isSignedIn } from "@/lib/auth/server/session";

export const metadata: Metadata = {
  title: "Sign in | Laitstyle",
  description: "Sign in to Laitstyle with Google or email.",
};

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = getSafeNextPath(params.next, "/account");
  const surface = next.startsWith("/admin") ? "staff" : "consumer";

  if (surface === "consumer") {
    redirect(`/?auth=signin&next=${encodeURIComponent(next)}`);
  }

  if (await isSignedIn()) {
    redirect(next);
  }

  return (
    <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[960px] overflow-hidden rounded-lg border-border bg-card p-0 shadow-laitstyle">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <section className="flex min-h-[520px] flex-col justify-between bg-sidebar px-7 py-8 text-sidebar-foreground sm:px-9">
            <Link className="inline-flex items-center gap-3" href="/">
              <span className="grid size-12 place-items-center rounded-xl border border-sidebar-border bg-sidebar-accent">
                <LaitstyleSymbol aria-hidden="true" className="h-8 w-5" focusable="false" />
              </span>
              <span>
                <span className="block font-serif text-2xl leading-none">Laitstyle</span>
                <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
                  {surface === "staff" ? "Control room access" : "Customer account"}
                </span>
              </span>
            </Link>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/58">
                Supabase Auth
              </p>
              <h1 className="mt-4 max-w-[420px] font-serif text-[42px] font-medium leading-[1.02] sm:text-[52px]">
                {surface === "staff" ? "Open the store workspace." : "Return to your rail."}
              </h1>
              <p className="mt-5 max-w-[430px] text-sm leading-6 text-sidebar-foreground/68">
                {surface === "staff"
                  ? "Owners, managers and operators sign in here. Store permissions are checked from membership records, not profile metadata."
                  : "Use the same secure account for holds, saved pieces, orders and delivery details."}
              </p>
            </div>

            <p className="text-xs leading-5 text-sidebar-foreground/56">
              Google OAuth returns through `/auth/callback`; email sign-in uses Supabase server-side
              cookies.
            </p>
          </section>

          <section className="px-6 py-8 sm:px-10">
            <div className="mx-auto flex max-w-[420px] flex-col gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Sign in
                </p>
                <h2 className="mt-2 font-serif text-3xl font-medium">Continue securely</h2>
              </div>

              <form action="/auth/google" method="post">
                <input name="next" type="hidden" value={next} />
                <Button className="h-12 w-full rounded-full text-sm font-semibold" type="submit">
                  Continue with Google
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                or
                <Separator className="flex-1" />
              </div>

              <form action={signInWithPassword} className="grid gap-3">
                <input name="next" type="hidden" value={next} />
                <label className="grid gap-1.5 text-sm font-medium" htmlFor="auth-email">
                  Email
                  <Input
                    autoComplete="email"
                    id="auth-email"
                    name="email"
                    placeholder="you@example.com"
                    type="email"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium" htmlFor="auth-password">
                  Password
                  <Input
                    autoComplete="current-password"
                    id="auth-password"
                    minLength={8}
                    name="password"
                    placeholder="Your password"
                    type="password"
                  />
                </label>
                <Button className="mt-1 h-11 rounded-full" type="submit" variant="outline">
                  Sign in with email
                </Button>
              </form>

              <p className="rounded-xl border border-border bg-muted/35 p-4 text-xs leading-5 text-muted-foreground">
                This page is reserved for Control Room staff. Customer sign-in and account creation
                happen in the storefront dialog.
              </p>
            </div>
          </section>
        </div>
      </Card>
    </main>
  );
}
