import { ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AUTH_DENIED_MESSAGES, type AuthDeniedReason } from "@/modules/auth/server/diagnostics";
import {
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthPageShell,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";

export function AdminAccessDenied({ reason }: { reason: AuthDeniedReason }) {
  return (
    <AuthPageShell
      description="The store workspace is available only to approved owner and manager accounts. Your current session does not have the required capability."
      eyebrow="Permission restricted"
      highlights={[
        "Server-verified owner and manager roles",
        "Operational controls hidden from storefront accounts",
        "Safe return path when access is unavailable",
      ]}
      sideDescription="Inventory, customer, order and reporting controls stay behind staff permissions. A storefront account cannot enter the workspace simply by knowing the URL."
      sideTitle="Store operations remain staff-only."
      staff
      title="This account cannot open Admin"
    >
      <div className="grid gap-6">
        <AuthStatusNotice tone="error">{AUTH_DENIED_MESSAGES[reason]}</AuthStatusNotice>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/auth/sign-in?next=/admin" />}
            size="lg"
          >
            <LogIn className="size-4" />
            Sign in as staff
          </Button>
          <Button
            className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
            nativeButton={false}
            render={<Link href="/" />}
            size="lg"
            variant="outline"
          >
            <ArrowLeft className="size-4" />
            Back to storefront
          </Button>
        </div>
      </div>
    </AuthPageShell>
  );
}
