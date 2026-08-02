"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  paymentMethodSetupQueryOptions,
  paymentMethodsQueryOptions,
  useCreatePaymentMethodSetup,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
  useVerifyPaymentMethodSetup,
} from "@/modules/payments/client/payment-methods";
import {
  preloadPaystackPopup,
  resumePaystackTransaction,
} from "@/modules/payments/client/paystack-popup";
import type { PaymentMethodSetup } from "@/modules/payments/types";
import { useAccountUi } from "@/modules/storefront-shell/ui/account-context";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "@/modules/storefront-shell/ui/account-primitives";

export function PaymentMethodsSection() {
  const { toast } = useAccountUi();
  const methods = useQuery(paymentMethodsQueryOptions());
  const createSetup = useCreatePaymentMethodSetup();
  const verifySetup = useVerifyPaymentMethodSetup();
  const setDefault = useSetDefaultPaymentMethod();
  const deleteMethod = useDeletePaymentMethod();
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [setup, setSetup] = useState<PaymentMethodSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setupStatus = useQuery(paymentMethodSetupQueryOptions(setup?.attemptId ?? ""));
  const canonicalSetup = setupStatus.data ?? setup;

  useEffect(() => {
    void preloadPaystackPopup();
  }, []);

  useEffect(() => {
    if (canonicalSetup?.method && canonicalSetup.status === "success") {
      void methods.refetch();
    }
  }, [canonicalSetup?.method, canonicalSetup?.status, methods.refetch]);

  async function beginSetup() {
    setError(null);
    try {
      const created = await createSetup.mutateAsync({ idempotencyKey: crypto.randomUUID() });
      setSetup(created);
      if (!created.accessCode) throw new Error("Paystack setup is not ready.");
      const outcome = await resumePaystackTransaction(created.accessCode);
      if (outcome.kind === "cancelled") {
        setError("Payment method setup was cancelled.");
        return;
      }
      if (outcome.kind === "error") {
        setError(outcome.message);
        return;
      }
      const verified = await verifySetup.mutateAsync(created.attemptId);
      setSetup(verified);
      toast("Payment method verified. The NGN 50 setup refund is being reconciled.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Payment method setup could not be completed.",
      );
    }
  }

  async function makeDefault(methodId: string) {
    setError(null);
    try {
      await setDefault.mutateAsync(methodId);
      toast("Default payment method updated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Default method could not be updated.");
    }
  }

  async function removeMethod() {
    if (!removingId) return;
    setError(null);
    try {
      await deleteMethod.mutateAsync(removingId);
      setRemovingId(null);
      toast("Payment method removed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment method could not be removed.");
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Tokenized methods only</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Payment methods.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Paystack owns card collection. Laitstyles stores encrypted reusable authorization codes
            and masked descriptors only.
          </p>
        </div>
        <AcctButton
          onClick={() => {
            setSetup(null);
            setError(null);
            setAddOpen(true);
          }}
        >
          Add method
        </AcctButton>
      </header>

      {error ? (
        <p
          className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {methods.isPending ? (
        <p className="mt-7" role="status">
          Loading payment methods…
        </p>
      ) : null}
      {methods.isError ? (
        <p className="mt-7" role="alert">
          Payment methods could not be loaded.
        </p>
      ) : null}
      {methods.data?.length === 0 ? (
        <div className={cn("mt-7 p-8 text-center", panelClass)}>
          <CreditCard className="mx-auto size-8 text-[var(--acc-sage-deep)]" />
          <p className="mt-4 font-semibold">No saved payment method</p>
          <p className="mt-2 text-sm text-[var(--acc-muted)]">
            Add one through Paystack&apos;s NGN 50 refundable setup flow.
          </p>
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        {methods.data?.map((method) => (
          <article
            key={method.id}
            className={cn(
              "flex flex-col p-5 sm:p-6",
              method.isDefault ? panelElevatedClass : panelClass,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <Eyebrow className="text-[var(--acc-muted)]">
                {method.brand ?? method.channel ?? "Paystack"}
              </Eyebrow>
              <StatusBadge variant={method.isDefault ? "success" : "neutral"}>
                {method.isDefault ? "Default" : method.status}
              </StatusBadge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-[12px] bg-[var(--acc-ink)] px-5 py-6 text-[var(--acc-bone)] shadow-[var(--acc-shadow-sm)]">
              <h2 className={cn("text-2xl tracking-[.06em] sm:text-3xl", monoClass)}>
                •••• {method.last4 ?? "••••"}
              </h2>
              <p className="text-sm text-[color-mix(in_srgb,var(--acc-bone)_70%,transparent)]">
                {method.expMonth && method.expYear
                  ? `Exp ${method.expMonth}/${method.expYear.slice(-2)}`
                  : "Reusable"}
              </p>
            </div>
            <p className="mt-5 text-sm text-[var(--acc-muted)]">
              {[method.bank, method.channel].filter(Boolean).join(" · ") ||
                "Paystack authorization"}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--acc-line)] pt-4">
              {!method.isDefault ? (
                <Button
                  size="lg"
                  variant="link"
                  onClick={() => void makeDefault(method.id)}
                  disabled={setDefault.isPending}
                >
                  Make default
                </Button>
              ) : null}
              <Button size="lg" variant="link" onClick={() => setRemovingId(method.id)}>
                Remove
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add payment method</DialogTitle>
            <DialogDescription>
              A fixed NGN 50 server-created setup charge verifies a reusable Paystack authorization,
              then an equal refund is requested automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5" />
              <div>
                <p className="font-semibold">Provider-hosted collection</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No card number, expiry or CVV enters Laitstyles&apos; browser forms or server
                  logs.
                </p>
              </div>
            </div>
          </div>
          {canonicalSetup ? (
            <div className="rounded-lg border p-4 text-sm">
              <p>
                <strong>Setup:</strong> {canonicalSetup.status}
              </p>
              <p className="mt-1">
                <strong>Refund:</strong> {canonicalSetup.refundStatus.replaceAll("_", " ")}
              </p>
              {canonicalSetup.method ? (
                <p className="mt-1">
                  <strong>Method:</strong> {canonicalSetup.method.brand ?? "Card"} ending{" "}
                  {canonicalSetup.method.last4}
                </p>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => void beginSetup()}
              disabled={createSetup.isPending || verifySetup.isPending}
            >
              {createSetup.isPending
                ? "Preparing…"
                : verifySetup.isPending
                  ? "Verifying…"
                  : canonicalSetup?.method
                    ? "Add another method"
                    : "Continue securely"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removingId)} onOpenChange={(open) => !open && setRemovingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this payment method?</DialogTitle>
            <DialogDescription>
              Paystack authorization will be deactivated where supported, then the local method will
              be tombstoned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingId(null)}>
              Keep method
            </Button>
            <Button
              variant="destructive"
              onClick={() => void removeMethod()}
              disabled={deleteMethod.isPending}
            >
              {deleteMethod.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
