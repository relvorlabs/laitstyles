"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPaymentsQueryOptions } from "@/modules/payments/client/admin-payments";
import {
  type AdminPaymentRecord,
  type RefundRecord,
  refundsQueryOptions,
  useCreateRefund,
  useRetryRefund,
} from "@/modules/payments/client/refunds";
import { PaymentTimeline } from "@/modules/payments/ui/payment-timeline";

export function RefundsWorkspace({ canRefund }: { canRefund: boolean }) {
  const paymentsQuery = useQuery(adminPaymentsQueryOptions({ status: "success", perPage: 50 }));
  const refundsQuery = useQuery(refundsQueryOptions({ perPage: 50 }));
  const createRefund = useCreateRefund();
  const retryRefund = useRetryRefund();
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [amountNaira, setAmountNaira] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const payments = paymentsQuery.data ?? [];
  const refunds = refundsQuery.data ?? [];
  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) ?? null,
    [payments, selectedPaymentId],
  );
  const amountMinor = toMinorUnits(amountNaira);
  const exceedsRemaining = Boolean(
    selectedPayment && amountMinor !== null && amountMinor > selectedPayment.refundableAmountMinor,
  );

  async function submitRefund() {
    if (!canRefund) return;
    if (!selectedPayment || amountMinor === null || amountMinor < 1 || exceedsRemaining) {
      setMessage({
        tone: "error",
        text: "Choose a captured payment and enter a refundable amount.",
      });
      return;
    }
    setMessage(null);
    try {
      const refund = await createRefund.mutateAsync({
        paymentId: selectedPayment.id,
        amountMinor,
        currency: "NGN",
        reason: reason.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setAmountNaira("");
      setReason("");
      setMessage({
        tone: "success",
        text:
          refund.status === "processed"
            ? "Paystack confirmed the refund."
            : "Refund submitted. Financial totals will change only after Paystack confirms processing.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: readableError(error, "The refund could not be submitted."),
      });
    }
  }

  async function retry(refund: RefundRecord) {
    setMessage(null);
    try {
      await retryRefund.mutateAsync({ refundId: refund.id, idempotencyKey: crypto.randomUUID() });
      setMessage({
        tone: "success",
        text: "Paystack truth was checked. The refund remains pending until provider confirmation.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: readableError(error, "The refund could not be reconciled."),
      });
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1360px] gap-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-4 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
            <Undo2 className="size-3.5" /> Provider-confirmed money movement
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-tight">Refunds</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Submit full or partial refunds against captured Paystack payments. Submitted is not the
            same as processed; order totals move only after authoritative confirmation.
          </p>
        </div>
        <SummaryCards payments={payments} refunds={refunds} />
      </header>

      <div className="grid gap-7 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-7">
          <h2 className="font-serif text-2xl font-medium">Request a refund</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Only the store owner can execute provider refunds. Managers can review the lifecycle.
          </p>

          <label className="mt-6 block text-sm font-semibold" htmlFor="refund-payment">
            Captured payment
          </label>
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={!canRefund || createRefund.isPending}
            id="refund-payment"
            onChange={(event) => {
              setSelectedPaymentId(event.target.value);
              setAmountNaira("");
            }}
            value={selectedPaymentId}
          >
            <option value="">Select a payment</option>
            {payments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {payment.orderNumber} ·{" "}
                {formatMoney(payment.refundableAmountMinor, payment.currency)} available
              </option>
            ))}
          </select>

          {selectedPayment ? (
            <div className="mt-3 rounded-2xl border border-border bg-muted/25 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Captured</span>
                <strong>
                  {formatMoney(selectedPayment.amountMinor, selectedPayment.currency)}
                </strong>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">Remaining refundable</span>
                <strong>
                  {formatMoney(selectedPayment.refundableAmountMinor, selectedPayment.currency)}
                </strong>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="block text-sm font-semibold" htmlFor="refund-amount">
                Amount (NGN)
              </label>
              <Input
                aria-invalid={exceedsRemaining}
                disabled={!canRefund || createRefund.isPending}
                id="refund-amount"
                inputMode="decimal"
                min="0.01"
                onChange={(event) => setAmountNaira(event.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={amountNaira}
              />
            </div>
            <Button
              disabled={!canRefund || !selectedPayment || selectedPayment.refundableAmountMinor < 1}
              onClick={() =>
                selectedPayment &&
                setAmountNaira((selectedPayment.refundableAmountMinor / 100).toFixed(2))
              }
              type="button"
              variant="outline"
            >
              Full amount
            </Button>
          </div>
          {exceedsRemaining ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              This exceeds the remaining refundable amount.
            </p>
          ) : null}

          <label className="mt-5 block text-sm font-semibold" htmlFor="refund-reason">
            Reason
          </label>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={!canRefund || createRefund.isPending}
            id="refund-reason"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this refund being issued?"
            value={reason}
          />

          {!canRefund ? (
            <div className="mt-5 rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
              Read-only finance access. An owner must submit or retry refunds.
            </div>
          ) : null}
          {message ? <Feedback message={message} /> : null}
          <Button
            className="mt-6 w-full"
            disabled={!canRefund || createRefund.isPending || exceedsRemaining}
            onClick={submitRefund}
            size="lg"
            type="button"
          >
            {createRefund.isPending ? "Submitting to Paystack…" : "Submit refund"}
          </Button>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-medium">Refund lifecycle</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Provider state, audit actor and timestamps—not optimistic success.
              </p>
            </div>
            {refundsQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">Refreshing…</span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3">
            {refundsQuery.isPending ? (
              <EmptyState text="Loading refund records…" />
            ) : refundsQuery.isError ? (
              <EmptyState text="Refund records could not be loaded." tone="error" />
            ) : refunds.length === 0 ? (
              <EmptyState text="No refund commands have been submitted yet." />
            ) : (
              refunds.map((refund) => (
                <RefundRow
                  canRefund={canRefund}
                  key={refund.id}
                  onRetry={() => retry(refund)}
                  pending={retryRefund.isPending}
                  refund={refund}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <PaymentTimeline paymentId={selectedPayment?.id ?? null} />
    </div>
  );
}

function SummaryCards({
  payments,
  refunds,
}: {
  payments: AdminPaymentRecord[];
  refunds: RefundRecord[];
}) {
  const pending = refunds.filter((refund) =>
    ["pending", "processing", "needs_attention"].includes(refund.status),
  ).length;
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Metric label="Captured" value={payments.length} />
      <Metric label="Refunds" value={refunds.length} />
      <Metric label="Open" value={pending} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-sm">
      <strong className="block text-xl font-semibold">{value}</strong>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function RefundRow({
  refund,
  canRefund,
  pending,
  onRetry,
}: {
  refund: RefundRecord;
  canRefund: boolean;
  pending: boolean;
  onRetry: () => void;
}) {
  const retryable = refund.status === "failed" || refund.status === "needs_attention";
  return (
    <article className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <strong>{refund.orderNumber}</strong>
            <StatusBadge status={refund.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatMoney(refund.requestedAmountMinor, refund.currency)} requested
            {refund.processedAmountMinor > 0
              ? ` · ${formatMoney(refund.processedAmountMinor, refund.currency)} processed`
              : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Requested {formatDate(refund.requestedAt)} by {refund.requestedBy ?? "system"}
          </p>
          {refund.failureReason ? (
            <p className="mt-3 text-sm text-destructive">{refund.failureReason}</p>
          ) : null}
        </div>
        {retryable && canRefund ? (
          <Button disabled={pending} onClick={onRetry} size="sm" type="button" variant="outline">
            <RotateCcw className="size-4" /> Reconcile and retry
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: RefundRecord["status"] }) {
  const icon =
    status === "processed" ? (
      <CheckCircle2 className="size-3.5" />
    ) : status === "failed" || status === "needs_attention" ? (
      <AlertCircle className="size-3.5" />
    ) : (
      <Clock3 className="size-3.5" />
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
      {icon} {status.replaceAll("_", " ")}
    </span>
  );
}

function Feedback({ message }: { message: { tone: "error" | "success"; text: string } }) {
  return (
    <div
      className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${
        message.tone === "error"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-primary/20 bg-primary/10 text-foreground"
      }`}
      role={message.tone === "error" ? "alert" : "status"}
    >
      {message.text}
    </div>
  );
}

function EmptyState({ text, tone = "normal" }: { text: string; tone?: "normal" | "error" }) {
  return (
    <div
      className={`rounded-2xl border border-dashed px-5 py-10 text-center text-sm ${
        tone === "error"
          ? "border-destructive/30 text-destructive"
          : "border-border text-muted-foreground"
      }`}
      role={tone === "error" ? "alert" : undefined}
    >
      {text}
    </div>
  );
}

function toMinorUnits(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amountMinor / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
