import Link from "next/link";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AUTH_DENIED_MESSAGES, type AuthDeniedReason } from "@/lib/auth/auth-errors";

export function ControlRoomAccessDenied({ reason }: { reason: AuthDeniedReason }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-[560px] gap-5 rounded-lg p-6 text-center shadow-laitstyle sm:p-8">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-border bg-surface-raised">
          <LaitstyleSymbol aria-hidden="true" className="h-10 w-7" focusable="false" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Permission restricted
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium">Admin is staff-only</h1>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{AUTH_DENIED_MESSAGES[reason]}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="rounded-full px-5" render={<Link href="/auth/sign-in?next=/admin" />}>
            Sign in as staff
          </Button>
          <Button className="rounded-full px-5" render={<Link href="/" />} variant="outline">
            Back to storefront
          </Button>
        </div>
      </Card>
    </main>
  );
}
