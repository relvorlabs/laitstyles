import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithPassword } from "@/app/auth/actions";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/modules/auth/server/diagnostics";
import { getSafeNextPath } from "@/modules/auth/server/redirects";
import { getCurrentSession, isAuthenticated } from "@/modules/auth/server/session";
import { AuthPageShell } from "@/modules/auth/ui/auth-page-shell";
import { SignInForm } from "@/modules/auth/ui/sign-in-form";

export const metadata: Metadata = {
  title: "Team sign in | Laitstyle",
  description: "Sign in to manage the Laitstyle store.",
};

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = getSafeNextPath(params.next, "/account");
  const surface = next.startsWith("/admin") ? "staff" : "consumer";
  const errorCode = isAuthFlowErrorCode(params.error) ? params.error : null;

  if (surface === "consumer") {
    const target = new URL("/", "https://laitstyle.localhost");
    target.searchParams.set("auth", "signin");
    target.searchParams.set("next", next);
    if (errorCode) target.searchParams.set("error", errorCode);
    redirect(`${target.pathname}${target.search}`);
  }

  if (isAuthenticated(await getCurrentSession())) {
    redirect(next);
  }

  return (
    <AuthPageShell
      description="Use your approved Laitstyle team account to continue."
      eyebrow="Team access"
      footer={
        <p className="text-center text-[13px] leading-5 text-muted-foreground">
          Shopping instead?{" "}
          <Link
            className="font-semibold text-foreground underline-offset-4 hover:underline"
            href="/"
          >
            Return to the storefront
          </Link>
        </p>
      }
      highlights={[
        "Owner and manager access",
        "Inventory, orders and customer care in one place",
        "Protected access to your store workspace",
      ]}
      sideDescription="Manage new pieces, orders, customers and the daily work behind the Laitstyle storefront."
      sideTitle="Your store, ready when you are."
      staff
      title="Welcome back"
    >
      <SignInForm
        action={signInWithPassword}
        initialError={
          errorCode ? { code: errorCode, message: getAuthFlowErrorMessage(errorCode) } : undefined
        }
        next={next}
      />
    </AuthPageShell>
  );
}
