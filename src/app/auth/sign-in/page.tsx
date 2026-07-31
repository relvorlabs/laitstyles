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
  title: "Staff sign in | Laitstyle",
  description: "Securely sign in to the Laitstyle store workspace.",
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
      description="Use your approved staff account to continue. Your role is checked again on the server before any store operation is shown."
      eyebrow="Staff access"
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
        "Role-based access for owners and managers",
        "Protected inventory, order and customer operations",
        "One secure session across the store workspace",
      ]}
      sideDescription="Move between inventory, orders, customers and daily store decisions from one protected workspace—without exposing operational controls to storefront accounts."
      sideTitle="Keep the whole store within reach."
      staff
      title="Welcome back to the workspace"
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
