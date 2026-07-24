import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
} from "@/lib/auth/auth-errors";
import { getSafeNextPath } from "@/lib/auth/server/redirects";

export const metadata: Metadata = {
  title: "Auth issue | Laitstyle",
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
  const message = isAuthFlowErrorCode(params.code)
    ? getAuthFlowErrorMessage(params.code)
    : "We could not complete that sign-in request.";
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(next)}`;

  return (
    <main className="flex min-h-[calc(100dvh-160px)] items-center justify-center px-4 py-12">
      <Card className="max-w-[520px] gap-5 rounded-lg p-6 text-center shadow-laitstyle sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Sign-in issue
        </p>
        <h1 className="font-serif text-4xl font-medium">Let&apos;s try that again</h1>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href={signInHref} />}>
            Back to sign in
          </Button>
          <Button size="lg" nativeButton={false} render={<Link href="/" />} variant="outline">
            Return to storefront
          </Button>
        </div>
      </Card>
    </main>
  );
}
