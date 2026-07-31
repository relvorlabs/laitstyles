"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreatePayoutRecipient,
  useDeletePayoutRecipient,
  useResolvePayoutAccount,
} from "@/modules/payments/client/finance";
import type {
  PayoutBankRecord,
  PayoutRecipientRecord,
} from "@/modules/payments/finance-contract";
import {
  FinanceCard,
  FinanceEmptyState,
  FinanceFeedbackBanner,
  FinanceField,
  readableFinanceError,
  type FinanceFeedback,
} from "@/modules/payments/ui/finance/finance-ui";

export function FinanceRecipientsPanel({
  banks,
  canTransfer,
  isPending,
  recipients,
}: {
  banks: PayoutBankRecord[];
  canTransfer: boolean;
  isPending: boolean;
  recipients: PayoutRecipientRecord[];
}) {
  const resolveAccount = useResolvePayoutAccount();
  const createRecipient = useCreatePayoutRecipient();
  const deleteRecipient = useDeletePayoutRecipient();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [name, setName] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FinanceFeedback>(null);

  async function resolve() {
    setFeedback(null);
    try {
      const result = await resolveAccount.mutateAsync({ accountNumber, bankCode });
      setResolvedName(result.accountName);
      setName(result.accountName);
    } catch (error: unknown) {
      setResolvedName(null);
      setFeedback({
        tone: "error",
        text: readableFinanceError(error, "The account could not be resolved."),
      });
    }
  }

  async function save() {
    if (!resolvedName) return;
    try {
      await createRecipient.mutateAsync({ name, accountNumber, bankCode, currency: "NGN" });
      setBankCode("");
      setAccountNumber("");
      setName("");
      setResolvedName(null);
      setFeedback({
        tone: "success",
        text: "Payout recipient saved with masked account details.",
      });
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        text: readableFinanceError(error, "The recipient could not be saved."),
      });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(340px,.75fr)_minmax(0,1.25fr)]">
      <FinanceCard title="Add payout recipient">
        <p className="text-sm text-muted-foreground">
          Paystack resolves the account name; the account number is encrypted before persistence.
        </p>
        <FinanceField htmlFor="finance-bank" label="Bank">
          <select
            className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
            disabled={!canTransfer}
            id="finance-bank"
            onChange={(event) => {
              setBankCode(event.target.value);
              setResolvedName(null);
            }}
            value={bankCode}
          >
            <option value="">Select a bank</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </FinanceField>
        <FinanceField htmlFor="finance-account-number" label="Account number">
          <Input
            disabled={!canTransfer}
            id="finance-account-number"
            inputMode="numeric"
            maxLength={20}
            onChange={(event) => {
              setAccountNumber(event.target.value);
              setResolvedName(null);
            }}
            value={accountNumber}
          />
        </FinanceField>
        <Button
          className="mt-4 w-full"
          disabled={!canTransfer || !bankCode || accountNumber.length < 6 || resolveAccount.isPending}
          onClick={resolve}
          type="button"
          variant="outline"
        >
          {resolveAccount.isPending ? "Resolving…" : "Resolve account"}
        </Button>
        {resolvedName ? (
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolved name</p>
            <p className="mt-1 font-semibold">{resolvedName}</p>
          </div>
        ) : null}
        <FinanceField htmlFor="finance-recipient-name" label="Recipient label">
          <Input
            disabled={!canTransfer || !resolvedName}
            id="finance-recipient-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </FinanceField>
        {feedback ? <FinanceFeedbackBanner feedback={feedback} /> : null}
        <Button
          className="mt-5 w-full"
          disabled={!canTransfer || !resolvedName || createRecipient.isPending}
          onClick={save}
          type="button"
        >
          Save recipient
        </Button>
      </FinanceCard>

      <FinanceCard title="Saved recipients">
        <div className="grid gap-3">
          {isPending ? (
            <FinanceEmptyState text="Loading recipients…" />
          ) : recipients.length ? (
            recipients.map((recipient) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4"
                key={recipient.id}
              >
                <div>
                  <p className="font-semibold">{recipient.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {recipient.bankName ?? recipient.bankCode} · {recipient.maskedAccountNumber} ·{" "}
                    {recipient.accountName}
                  </p>
                </div>
                <Button
                  disabled={!canTransfer || deleteRecipient.isPending}
                  onClick={() => deleteRecipient.mutate(recipient.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <FinanceEmptyState text="No active payout recipients." />
          )}
        </div>
      </FinanceCard>
    </div>
  );
}
