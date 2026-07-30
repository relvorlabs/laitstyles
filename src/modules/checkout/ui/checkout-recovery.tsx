"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, LockKeyhole, RefreshCcw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  checkoutQueryOptions,
  useVerifyCheckoutPayment,
} from "@/modules/checkout/client/hooks";
import type {
  CheckoutDetail,
  CheckoutStatus,
} from "@/modules/checkout/types";
import {
  preloadPaystackPopup,
  resumePaystackTransaction,
} from "@/modules/payments/client/paystack-popup";
import {
  useStorefrontCart,
  useStorefrontHolds,
} from "@/modules/storefront-shell/client/storefront-runtime";

type RecoveryAction = "idle" | "opening" | "verifying" | "checking";

const retryableStatuses = new Set<CheckoutStatus>([
  "failed",
  "abandoned",
  "reversed",
]);
const pendingStatuses = new Set<CheckoutStatus>([
  "initializing",
  "initialized",
  "pending",
]);

export function CheckoutRecovery({
  initialCheckout,
}: {
  initialCheckout: CheckoutDetail;
}) {
  const router = useRouter();
  const cart = useStorefrontCart();
  const holds = useStorefrontHolds();
  const verifyPayment = useVerifyCheckoutPayment();
  const checkoutStatus = useQuery(checkoutQueryOptions(initialCheckout.checkoutId));
  const canonical = checkoutStatus.data ?? initialCheckout;
  const [action, setAction] = useState<RecoveryAction>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const completedOrder = useRef<string | null>(null);

  useEffect(() => {
    void preloadPaystackPopup();
  }, []);

  const finishSuccess = useCallback(
    (orderNumber: string) => {
      if (completedOrder.current === orderNumber) return;
      completedOrder.current = orderNumber;
      for (const productId of new Set(initialCheckout.lines.map((line) => line.productId))) {
        holds.releaseProduct(productId);
      }
      cart.clear();
      router.replace(`/order-confirmation?order=${encodeURIComponent(orderNumber)}`);
    },
    [cart, holds, initialCheckout.lines, router],
  );

  useEffect(() => {
    if (canonical.status === "success") finishSuccess(canonical.orderNumber);
  }, [canonical.orderNumber, canonical.status, finishSuccess]);

  async function resumePayment() {
    if (!canonical.accessCode) {
      setMessage("Paystack checkout is not ready. Check the server status again.");
      return;
    }

    setMessage(null);
    setAction("opening");
    const outcome = await resumePaystackTransaction(canonical.accessCode);
    if (outcome.kind === "cancelled") {
      setAction("idle");
      setMessage("Payment was cancelled. The recorded checkout remains available to retry.");
      return;
    }
    if (outcome.kind === "error") {
      setAction("idle");
      setMessage(outcome.message);
      return;
    }

    setAction("verifying");
    try {
      const settlement = await verifyPayment.mutateAsync(canonical.paymentId);
      if (settlement.status === "success") {
        finishSuccess(settlement.orderNumber);
        return;
      }
      const refreshed = await checkoutStatus.refetch();
      const status = refreshed.data?.status ?? settlement.status;
      setAction("idle");
      setMessage(statusMessage(status));
    } catch (error) {
      setAction("idle");
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be verified. The checkout remains available to retry.",
      );
    }
  }

  async function checkStatus() {
    setMessage(null);
    setAction("checking");
    try {
      const refreshed = await checkoutStatus.refetch();
      const next = refreshed.data ?? canonical;
      if (next.status === "success") {
        finishSuccess(next.orderNumber);
        return;
      }
      setMessage(statusMessage(next.status));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Checkout status could not be refreshed.",
      );
    } finally {
      setAction("idle");
    }
  }

  const pending = pendingStatuses.has(canonical.status);
  const retryable = retryableStatuses.has(canonical.status);
  const reviewRequired = canonical.status === "review_required";
  const busy = action !== "idle" || verifyPayment.isPending || checkoutStatus.isFetching;

  return (
    <main className="flex min-h-[75dvh] items-center justify-center bg-[#ECEBE6] px-5 py-10">
      <Card className="w-full max-w-[760px] gap-0 overflow-hidden rounded-lg bg-card p-0 shadow-laitstyle ring-0">
        <header className="border-b border-border px-6 py-6 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">
            Paystack checkout recovery
          </p>
          <h1 className="mt-2 font-serif text-4xl">Order {canonical.orderNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reference {canonical.reference} · {money(canonical.totalMinor)}
          </p>
        </header>

        <section className="space-y-5 px-6 py-7 sm:px-8">
          {pending ? (
            <Alert>
              <Clock className="size-4" />
              <AlertTitle>Payment is still pending</AlertTitle>
              <AlertDescription>
                The order and Paystack reference are saved. Resume Checkout or check the canonical
                server status; no local success is assumed.
              </AlertDescription>
            </Alert>
          ) : null}

          {retryable ? (
            <Alert variant="destructive">
              <RotateCcw className="size-4" />
              <AlertTitle>Payment was not completed</AlertTitle>
              <AlertDescription>
                The recorded order remains unpaid. You may retry the same server-created Paystack
                checkout without creating another order.
              </AlertDescription>
            </Alert>
          ) : null}

          {reviewRequired ? (
            <Alert variant="destructive">
              <LockKeyhole className="size-4" />
              <AlertTitle>Payment needs review</AlertTitle>
              <AlertDescription>
                The provider facts did not match the recorded checkout. Do not retry until the store
                has reviewed the payment.
              </AlertDescription>
            </Alert>
          ) : null}

          {message ? (
            <Alert variant="destructive">
              <AlertTitle>Checkout update</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg border border-border">
            {canonical.lines.map((line) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0"
                key={line.id}
              >
                <div>
                  <p className="font-semibold">{line.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {[line.variantLabel, `Qty ${line.quantity}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="font-semibold">{money(line.unitPriceMinor * line.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
            <Button nativeButton={false} render={<Link href="/cart" />} variant="ghost">
              Return to bag
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => void checkStatus()} variant="outline">
                <RefreshCcw className="size-4" />
                {action === "checking" ? "Checking…" : "Check status"}
              </Button>
              {!reviewRequired ? (
                <Button disabled={busy || !canonical.accessCode} onClick={() => void resumePayment()}>
                  {action === "opening"
                    ? "Opening Paystack…"
                    : action === "verifying"
                      ? "Verifying…"
                      : retryable
                        ? "Retry Paystack"
                        : "Resume Paystack"}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </Card>
    </main>
  );
}

function statusMessage(status: CheckoutStatus) {
  switch (status) {
    case "success":
      return "Payment is confirmed.";
    case "failed":
    case "abandoned":
    case "reversed":
      return "Payment was not completed. You can retry the recorded checkout.";
    case "review_required":
      return "Payment requires store review before another attempt.";
    default:
      return "Payment confirmation is still pending. The server will keep checking.";
  }
}

function money(minor: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(minor / 100);
}
