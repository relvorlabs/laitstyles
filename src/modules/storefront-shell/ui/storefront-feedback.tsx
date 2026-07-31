"use client";

import { Check, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckoutStatus } from "@/modules/checkout/types";

export type StorefrontToastTone = "default" | "removed" | "notify" | "bag" | "sold";

export type StorefrontToastData = {
  tone: StorefrontToastTone;
  title: string;
  message: string;
};

export function StorefrontCheckoutAlert({
  onDismiss,
  onResume,
  orderNumber,
  status,
}: {
  onDismiss: () => void;
  onResume: () => void;
  orderNumber: string;
  status: CheckoutStatus;
}) {
  const copy =
    status === "failed" || status === "abandoned" || status === "reversed"
      ? "Your order is still waiting for payment. You can reopen it and try again safely."
      : status === "review_required"
        ? "Your payment is being reviewed. Reopen checkout to see the latest status."
        : "You have an unfinished checkout. Reopen it without entering your details again.";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[75] flex justify-center px-4 py-3">
      <div className="flex w-full max-w-[760px] items-center gap-3.5 rounded-full bg-[#20261C] py-2.5 pl-5 pr-3 text-white shadow-[0_20px_50px_rgba(0,0,0,.28)]">
        <span className="size-2 shrink-0 rounded-full bg-[#D4B26A] animate-[leemPulse_1.6s_ease-in-out_infinite]" />
        <span aria-live="polite" className="min-w-0 flex-1 text-[13px] leading-[1.4]">
          <strong>{orderNumber}</strong> · {copy}
        </span>
        <Button className="shrink-0" onClick={onResume} size="lg" type="button">
          Resume checkout
        </Button>
        <Button
          aria-label="Dismiss checkout reminder"
          className="shrink-0"
          onClick={onDismiss}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X className="size-[18px]" />
        </Button>
      </div>
    </div>
  );
}

export function StorefrontHoldAlert({
  count,
  onDismiss,
  secondsLeft,
}: {
  count: number;
  onDismiss: () => void;
  secondsLeft: number;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 py-3">
      <div className="flex w-full max-w-[720px] items-center gap-3.5 rounded-full bg-[#20261C] py-2.5 pl-5 pr-3 text-white shadow-[0_20px_50px_rgba(0,0,0,.28)]">
        <span className="size-2 shrink-0 rounded-full bg-[#B8CE8E] animate-[leemPulse_1.6s_ease-in-out_infinite]" />
        <span aria-live="polite" className="min-w-0 flex-1 text-[13px] leading-[1.4]">
          You&apos;re holding {count === 1 ? "1 piece" : `${count} pieces`} — checkout in{" "}
          <strong className="tabular-nums">{formatSeconds(secondsLeft)}</strong> before{" "}
          {count === 1 ? "it releases" : "they release"}.
        </span>
        <Button
          size="lg"
          className="shrink-0"
          nativeButton={false}
          render={<Link href="/checkout" />}
        >
          Checkout
        </Button>
        <Button
          aria-label="Dismiss hold alert"
          className="shrink-0"
          onClick={onDismiss}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X className="size-[18px]" />
        </Button>
      </div>
    </div>
  );
}

export function StorefrontToast({
  dismiss,
  toast,
}: {
  dismiss: () => void;
  toast: StorefrontToastData;
}) {
  const error = toast.tone === "removed" || toast.tone === "sold";

  return (
    <Alert className="fixed bottom-20 right-4 z-[70] flex max-w-[344px] items-start gap-[11px] rounded-md border-border bg-card px-[15px] py-[13px] shadow-[0_20px_50px_rgba(0,0,0,.16)] animate-[leemToastIn_.3s_cubic-bezier(.33,1,.68,1)]">
      <span
        className={cn(
          "mt-px flex size-6 shrink-0 items-center justify-center rounded-full",
          error ? "bg-[#F6E9E4]" : "bg-[#E4EBD3]",
        )}
      >
        {error ? (
          <Trash2 className="size-3.5 text-[#B04A45]" />
        ) : (
          <Check className="size-3.5 text-[#5F7043]" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <AlertTitle className="mb-0.5 text-[13px] leading-[1.35]">{toast.title}</AlertTitle>
        <AlertDescription className="text-[12.5px] leading-[1.45] text-muted-foreground">
          {toast.message}
        </AlertDescription>
      </div>
      <Button
        aria-label="Dismiss notification"
        className="shrink-0"
        onClick={dismiss}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </Alert>
  );
}

function formatSeconds(seconds = 0) {
  const value = Math.max(0, seconds);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
