import type { Metadata } from "next";
import { signUpWithPassword } from "@/app/auth/actions";
import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
} from "@/modules/auth/server/diagnostics";
import { AuthPageShell } from "@/modules/auth/ui/auth-page-shell";
import { SignUpForm } from "@/modules/auth/ui/sign-up-form";

export const metadata: Metadata = {
  title: "Create account | Laitstyle",
  description: "Create a secure Laitstyle customer account.",
};

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const errorCode = isAuthFlowErrorCode(params.error) ? params.error : null;

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
      <SignUpForm
        action={signUpWithPassword}
        initialError={
          errorCode ? { code: errorCode, message: getAuthFlowErrorMessage(errorCode) } : undefined
        }
      />
    </AuthPageShell>
  );
}
