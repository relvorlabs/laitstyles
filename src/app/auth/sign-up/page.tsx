import type { Metadata } from "next";
import { signUpWithPassword } from "@/app/auth/actions";
import { AuthPageShell, AuthStatusNotice } from "@/modules/auth/ui/auth-page-shell";
import { SignUpForm } from "@/modules/auth/ui/sign-up-form";

export const metadata: Metadata = {
  title: "Create account | Laitstyle",
  description: "Create a secure Laitstyle customer account.",
};

type SignUpPageProps = {
  searchParams: Promise<{ sent?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { sent } = await searchParams;

  return (
    <AuthPageShell
      description="Create one account for saved pieces, order history, delivery details and faster checkout across every Laitstyle drop."
      eyebrow="Customer account"
      highlights={[
        "Keep saved pieces and active holds together",
        "Track every order from payment to delivery",
        "Reuse trusted delivery details at checkout",
      ]}
      sideDescription="Your account keeps the pieces you care about, the orders you have placed and the delivery details you trust in one calm, private place."
      sideTitle="Every one-of-one find, remembered."
      title="Create your Laitstyle account"
    >
      <div className="grid gap-6">
        {sent === "1" ? (
          <AuthStatusNotice tone="success">
            If this address can receive a confirmation email, a secure link is on its way. Check your inbox and spam folder before requesting another one.
          </AuthStatusNotice>
        ) : null}
        <SignUpForm action={signUpWithPassword} />
      </div>
    </AuthPageShell>
  );
}
