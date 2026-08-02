"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useFinalizePayoutTransfer,
  useInitiatePayoutTransfer,
  useResendPayoutTransferOtp,
} from "@/modules/payments/client/finance";
import type {
  PayoutRecipientRecord,
  PayoutTransferRecord,
} from "@/modules/payments/finance-contract";
import {
  FinanceCard,
  FinanceEmptyState,
  type FinanceFeedback,
  FinanceFeedbackBanner,
  FinanceField,
  FinanceReviewRow,
  FinanceStatus,
  formatFinanceDate,
  formatFinanceMoney,
  humanFinanceStatus,
  readableFinanceError,
  toFinanceMinorUnits,
} from "@/modules/payments/ui/finance/finance-ui";

export function FinanceTransfersPanel({
  canTransfer,
  recipients,
  transfers,
}: {
  canTransfer: boolean;
  recipients: PayoutRecipientRecord[];
  transfers: PayoutTransferRecord[];
}) {
  const initiate = useInitiatePayoutTransfer();
  const finalize = useFinalizePayoutTransfer();
  const resendOtp = useResendPayoutTransferOtp();
  const [recipientId, setRecipientId] = useState("");
  const [amountNaira, setAmountNaira] = useState("");
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [otp, setOtp] = useState("");
  const [feedback, setFeedback] = useState<FinanceFeedback>(null);
  const recipient = useMemo(
    () => recipients.find((item) => item.id === recipientId) ?? null,
    [recipientId, recipients],
  );
  const amountMinor = toFinanceMinorUnits(amountNaira);
  const otpTransfer = transfers.find((transfer) => transfer.status === "otp_required") ?? null;
  const matchingUnresolved =
    recipient && amountMinor
      ? (transfers.find(
          (transfer) =>
            transfer.recipient.id === recipient.id &&
            transfer.amountMinor === amountMinor &&
            transfer.reason === reason.trim() &&
            ["needs_reconciliation", "otp_required", "pending", "processing"].includes(
              transfer.status,
            ),
        ) ?? null)
      : null;

  async function confirmTransfer() {
    if (!recipient || !amountMinor || reason.trim().length < 3 || matchingUnresolved) return;
    try {
      const transfer = await initiate.mutateAsync({
        recipientId: recipient.id,
        amountMinor,
        currency: "NGN",
        reason: reason.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      setReviewing(false);
      setRecipientId("");
      setAmountNaira("");
      setReason("");
      setFeedback({
        tone: "success",
        text:
          transfer.status === "otp_required"
            ? "Transfer intent created. Enter the Paystack OTP to continue."
            : "Transfer submitted. Status remains provider-authoritative.",
      });
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        text: readableFinanceError(error, "The transfer could not be initiated."),
      });
    }
  }

  async function submitOtp() {
    if (!otpTransfer) return;
    try {
      const transfer = await finalize.mutateAsync({
        transferId: otpTransfer.id,
        otp,
        idempotencyKey: crypto.randomUUID(),
      });
      setOtp("");
      setFeedback({
        tone: "success",
        text: `Paystack now reports ${humanFinanceStatus(transfer.status)}.`,
      });
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        text: readableFinanceError(error, "The OTP could not be finalized."),
      });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]">
      <FinanceCard title="Manual owner transfer">
        <p className="text-sm text-muted-foreground">
          A local intent and exact reference are stored before Paystack is called.
        </p>
        <FinanceField htmlFor="transfer-recipient" label="Recipient">
          <select
            className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
            disabled={!canTransfer || initiate.isPending}
            id="transfer-recipient"
            onChange={(event) => {
              setRecipientId(event.target.value);
              setReviewing(false);
            }}
            value={recipientId}
          >
            <option value="">Select a saved recipient</option>
            {recipients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.maskedAccountNumber}
              </option>
            ))}
          </select>
        </FinanceField>
        <FinanceField htmlFor="transfer-amount" label="Amount (NGN)">
          <Input
            disabled={!canTransfer || initiate.isPending}
            id="transfer-amount"
            inputMode="decimal"
            min="0.01"
            onChange={(event) => {
              setAmountNaira(event.target.value);
              setReviewing(false);
            }}
            step="0.01"
            type="number"
            value={amountNaira}
          />
        </FinanceField>
        <FinanceField htmlFor="transfer-reason" label="Reason">
          <Input
            disabled={!canTransfer || initiate.isPending}
            id="transfer-reason"
            maxLength={240}
            onChange={(event) => {
              setReason(event.target.value);
              setReviewing(false);
            }}
            value={reason}
          />
        </FinanceField>
        {matchingUnresolved ? (
          <p className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50/40 p-3 text-sm dark:bg-amber-950/10">
            An unresolved transfer already matches this recipient, amount and reason. Resolve it
            before submitting the same intent again.
          </p>
        ) : null}
        <Button
          className="mt-5 w-full"
          disabled={
            !canTransfer ||
            !recipient ||
            !amountMinor ||
            reason.trim().length < 3 ||
            Boolean(matchingUnresolved)
          }
          onClick={() => setReviewing(true)}
          type="button"
          variant="outline"
        >
          Review transfer
        </Button>

        {reviewing && recipient && amountMinor ? (
          <div className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-50/40 p-4 dark:bg-amber-950/10">
            <p className="font-semibold">Confirm deliberate transfer</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <FinanceReviewRow
                label="Recipient"
                value={`${recipient.name} · ${recipient.maskedAccountNumber}`}
              />
              <FinanceReviewRow
                label="Resolved name"
                value={recipient.accountName ?? "Unavailable"}
              />
              <FinanceReviewRow label="Amount" value={formatFinanceMoney(amountMinor, "NGN")} />
              <FinanceReviewRow label="Currency" value="NGN" />
              <FinanceReviewRow label="Provider fee" value="Confirmed by Paystack" />
              <FinanceReviewRow label="Reason" value={reason.trim()} />
            </dl>
            <Button
              className="mt-4 w-full"
              disabled={initiate.isPending}
              onClick={confirmTransfer}
              type="button"
            >
              {initiate.isPending ? "Creating transfer intent…" : "Confirm and send to Paystack"}
            </Button>
          </div>
        ) : null}

        {otpTransfer ? (
          <div className="mt-6 rounded-2xl border border-border p-4">
            <p className="font-semibold">OTP required for {otpTransfer.reference}</p>
            <Input
              className="mt-3"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="6-digit OTP"
              value={otp}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={!/^\d{6}$/.test(otp) || finalize.isPending}
                onClick={submitOtp}
                type="button"
              >
                Finalize OTP
              </Button>
              <Button
                disabled={resendOtp.isPending}
                onClick={() =>
                  resendOtp.mutate({
                    transferId: otpTransfer.id,
                    idempotencyKey: crypto.randomUUID(),
                  })
                }
                type="button"
                variant="outline"
              >
                Resend OTP
              </Button>
            </div>
          </div>
        ) : null}
        {feedback ? <FinanceFeedbackBanner feedback={feedback} /> : null}
      </FinanceCard>

      <FinanceCard title="Transfer lifecycle">
        <div className="grid gap-3">
          {transfers.length ? (
            transfers.map((transfer) => (
              <div className="rounded-2xl border border-border p-4" key={transfer.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {transfer.recipient.name} ·{" "}
                      {formatFinanceMoney(transfer.amountMinor, transfer.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {transfer.reference} · {formatFinanceDate(transfer.initiatedAt)}
                    </p>
                  </div>
                  <FinanceStatus status={transfer.status} />
                </div>
                {transfer.failureReason ? (
                  <p className="mt-3 text-sm text-destructive">{transfer.failureReason}</p>
                ) : null}
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  {transfer.events[0]?.note ?? "Awaiting provider state."}
                </p>
              </div>
            ))
          ) : (
            <FinanceEmptyState text="No manual transfers have been created." />
          )}
        </div>
      </FinanceCard>
    </div>
  );
}
