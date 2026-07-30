"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  financeLedgerQueryOptions,
  financeOverviewQueryOptions,
  financeSettlementsQueryOptions,
  payoutBanksQueryOptions,
  payoutRecipientsQueryOptions,
  payoutTransfersQueryOptions,
  useCreatePayoutRecipient,
  useDeletePayoutRecipient,
  useFinalizePayoutTransfer,
  useInitiatePayoutTransfer,
  useReconcileFinance,
  useResendPayoutTransferOtp,
  useResolvePayoutAccount,
} from "@/modules/payments/client/finance";
import type {
  FinanceLedgerRecord,
  FinanceOverviewRecord,
  PayoutBankRecord,
  PayoutRecipientRecord,
  PayoutTransferRecord,
  ReconciliationRecord,
  SettlementRecord,
} from "@/modules/payments/finance-contract";

type Section = "ledger" | "overview" | "recipients" | "settlements" | "transfers";
type Feedback = { tone: "error" | "success"; text: string } | null;

export function FinanceWorkspace({ canTransfer }: { canTransfer: boolean }) {
  const [section, setSection] = useState<Section>("overview");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord[]>([]);
  const overview = useQuery(financeOverviewQueryOptions());
  const ledger = useQuery(financeLedgerQueryOptions({ perPage: 25 }));
  const settlements = useQuery(financeSettlementsQueryOptions({ perPage: 25 }));
  const recipients = useQuery(payoutRecipientsQueryOptions({ active: true, perPage: 100 }));
  const transfers = useQuery(payoutTransfersQueryOptions({ perPage: 50 }));
  const banks = useQuery(payoutBanksQueryOptions());
  const reconcile = useReconcileFinance();

  async function reconcileAll() {
    if (!canTransfer) return;
    setFeedback(null);
    try {
      const result = await reconcile.mutateAsync({
        scope: "all",
        idempotencyKey: crypto.randomUUID(),
      });
      setReconciliation(result.transactions?.items ?? []);
      setFeedback({
        tone: "success",
        text: "Provider truth was refreshed with existing references. No new transfer was created.",
      });
    } catch (error: unknown) {
      setFeedback({ tone: "error", text: readableError(error, "Finance reconciliation failed.") });
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-[1440px] gap-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Paystack-backed owner finance
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-tight">Finance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review provider balance, ledger and automatic settlements separately from deliberate
            owner-initiated transfers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!canTransfer ? (
            <span className="rounded-xl border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
              Read-only finance access
            </span>
          ) : null}
          <Button
            disabled={!canTransfer || reconcile.isPending}
            onClick={reconcileAll}
            type="button"
            variant="outline"
          >
            <RefreshCw className={reconcile.isPending ? "animate-spin" : ""} />
            Reconcile provider truth
          </Button>
        </div>
      </header>

      <nav aria-label="Finance sections" className="flex gap-2 overflow-x-auto pb-1">
        {(["overview", "ledger", "settlements", "recipients", "transfers"] as const).map(
          (item) => (
            <Button
              aria-current={section === item ? "page" : undefined}
              key={item}
              onClick={() => setSection(item)}
              size="sm"
              type="button"
              variant={section === item ? "default" : "outline"}
            >
              {humanStatus(item)}
            </Button>
          ),
        )}
      </nav>

      {feedback ? <FeedbackBanner feedback={feedback} /> : null}
      {section === "overview" ? (
        <OverviewPanel
          data={overview.data}
          isError={overview.isError}
          isPending={overview.isPending}
          reconciliation={reconciliation}
        />
      ) : null}
      {section === "ledger" ? (
        <LedgerPanel
          isError={ledger.isError}
          isPending={ledger.isPending}
          rows={ledger.data?.items ?? []}
        />
      ) : null}
      {section === "settlements" ? (
        <SettlementsPanel
          isError={settlements.isError}
          isPending={settlements.isPending}
          rows={settlements.data?.items ?? []}
        />
      ) : null}
      {section === "recipients" ? (
        <RecipientsPanel
          banks={banks.data ?? []}
          canTransfer={canTransfer}
          isPending={recipients.isPending}
          recipients={recipients.data?.items ?? []}
        />
      ) : null}
      {section === "transfers" ? (
        <TransfersPanel
          canTransfer={canTransfer}
          recipients={recipients.data?.items ?? []}
          transfers={transfers.data?.items ?? []}
        />
      ) : null}
    </main>
  );
}

function OverviewPanel({
  data,
  isError,
  isPending,
  reconciliation,
}: {
  data: FinanceOverviewRecord | undefined;
  isError: boolean;
  isPending: boolean;
  reconciliation: ReconciliationRecord[];
}) {
  if (isPending) return <EmptyState text="Loading Paystack finance overview…" />;
  if (isError || !data) return <EmptyState text="Finance overview could not be loaded." tone="error" />;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.balances.map((balance) => (
          <Metric
            key={balance.currency}
            label={`Available ${balance.currency}`}
            value={formatMoney(balance.availableAmountMinor, balance.currency)}
          />
        ))}
        <Metric label="Captured volume" value={formatMoney(data.totals.totalVolumeMinor, "NGN")} />
        <Metric label="Unresolved transfers" value={String(data.unresolvedTransfers)} />
        <Metric label="Pending settlements" value={String(data.pendingSettlements)} />
      </div>
      <Card title="Reconciliation outcomes">
        <p className="text-sm text-muted-foreground">
          Reconciliation reports mismatches without mutating payment state.
        </p>
        <div className="mt-5 grid gap-3">
          {reconciliation.length ? (
            reconciliation.map((record, index) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4"
                key={`${record.providerId ?? record.localId ?? "unknown"}-${index}`}
              >
                <div>
                  <p className="font-semibold">
                    {record.providerReference ?? record.localReference ?? "Unknown reference"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Provider {record.providerStatus ?? "missing"} · Local {record.localStatus ?? "missing"}
                  </p>
                </div>
                <Status status={record.outcome} />
              </div>
            ))
          ) : (
            <EmptyState text="Run reconciliation to compare provider and local facts." />
          )}
        </div>
      </Card>
    </div>
  );
}

function LedgerPanel({
  isError,
  isPending,
  rows,
}: {
  isError: boolean;
  isPending: boolean;
  rows: FinanceLedgerRecord[];
}) {
  if (isPending) return <EmptyState text="Loading provider ledger…" />;
  if (isError) return <EmptyState text="Provider ledger could not be loaded." tone="error" />;
  return (
    <Card title="Paystack balance ledger">
      <div className="grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              key={row.id}
            >
              <div>
                <p className="font-semibold">{row.reason ?? row.sourceType}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.sourceType} · {formatDate(row.createdAt)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-semibold">{formatSignedMoney(row.differenceMinor, row.currency)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Balance {formatMoney(row.balanceMinor, row.currency)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="No provider ledger entries were returned." />
        )}
      </div>
    </Card>
  );
}

function SettlementsPanel({
  isError,
  isPending,
  rows,
}: {
  isError: boolean;
  isPending: boolean;
  rows: SettlementRecord[];
}) {
  if (isPending) return <EmptyState text="Loading automatic settlements…" />;
  if (isError) return <EmptyState text="Settlements could not be loaded." tone="error" />;
  return (
    <Card title="Automatic Paystack settlements">
      <p className="text-sm text-muted-foreground">
        Provider payouts to the configured settlement account—not manual owner transfers.
      </p>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <div
              className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
              key={row.id}
            >
              <div>
                <p className="font-semibold">Settlement {row.providerSettlementId}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.settledAt ? formatDate(row.settledAt) : "Awaiting settlement date"}
                </p>
              </div>
              <div className="md:text-right">
                <p className="font-semibold">{formatMoney(row.effectiveAmountMinor, row.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  Fees {formatMoney(row.totalFeesMinor, row.currency)}
                </p>
              </div>
              <Status status={row.status} />
            </div>
          ))
        ) : (
          <EmptyState text="No settlements were returned." />
        )}
      </div>
    </Card>
  );
}

function RecipientsPanel({
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
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function resolve() {
    setFeedback(null);
    try {
      const result = await resolveAccount.mutateAsync({ accountNumber, bankCode });
      setResolvedName(result.accountName);
      setName(result.accountName);
    } catch (error: unknown) {
      setResolvedName(null);
      setFeedback({ tone: "error", text: readableError(error, "The account could not be resolved.") });
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
      setFeedback({ tone: "success", text: "Payout recipient saved with masked account details." });
    } catch (error: unknown) {
      setFeedback({ tone: "error", text: readableError(error, "The recipient could not be saved.") });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(340px,.75fr)_minmax(0,1.25fr)]">
      <Card title="Add payout recipient">
        <p className="text-sm text-muted-foreground">
          Paystack resolves the account name; the account number is encrypted before persistence.
        </p>
        <Field label="Bank">
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
        </Field>
        <Field label="Account number">
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
        </Field>
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
        <Field label="Recipient label">
          <Input
            disabled={!canTransfer || !resolvedName}
            id="finance-recipient-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Field>
        {feedback ? <FeedbackBanner feedback={feedback} /> : null}
        <Button
          className="mt-5 w-full"
          disabled={!canTransfer || !resolvedName || createRecipient.isPending}
          onClick={save}
          type="button"
        >
          Save recipient
        </Button>
      </Card>

      <Card title="Saved recipients">
        <div className="grid gap-3">
          {isPending ? (
            <EmptyState text="Loading recipients…" />
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
            <EmptyState text="No active payout recipients." />
          )}
        </div>
      </Card>
    </div>
  );
}

function TransfersPanel({
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
  const [feedback, setFeedback] = useState<Feedback>(null);
  const recipient = useMemo(
    () => recipients.find((item) => item.id === recipientId) ?? null,
    [recipientId, recipients],
  );
  const amountMinor = toMinorUnits(amountNaira);
  const otpTransfer = transfers.find((transfer) => transfer.status === "otp_required") ?? null;

  async function confirmTransfer() {
    if (!recipient || !amountMinor || reason.trim().length < 3) return;
    try {
      const transfer = await initiate.mutateAsync({
        recipientId: recipient.id,
        amountMinor,
        currency: "NGN",
        reason: reason.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      setReviewing(false);
      setFeedback({
        tone: "success",
        text:
          transfer.status === "otp_required"
            ? "Transfer intent created. Enter the Paystack OTP to continue."
            : "Transfer submitted. Status remains provider-authoritative.",
      });
    } catch (error: unknown) {
      setFeedback({ tone: "error", text: readableError(error, "The transfer could not be initiated.") });
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
      setFeedback({ tone: "success", text: `Paystack now reports ${humanStatus(transfer.status)}.` });
    } catch (error: unknown) {
      setFeedback({ tone: "error", text: readableError(error, "The OTP could not be finalized.") });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]">
      <Card title="Manual owner transfer">
        <p className="text-sm text-muted-foreground">
          A local intent and exact reference are stored before Paystack is called.
        </p>
        <Field label="Recipient">
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
        </Field>
        <Field label="Amount (NGN)">
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
        </Field>
        <Field label="Reason">
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
        </Field>
        <Button
          className="mt-5 w-full"
          disabled={!canTransfer || !recipient || !amountMinor || reason.trim().length < 3}
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
              <ReviewRow label="Recipient" value={`${recipient.name} · ${recipient.maskedAccountNumber}`} />
              <ReviewRow label="Resolved name" value={recipient.accountName ?? "Unavailable"} />
              <ReviewRow label="Amount" value={formatMoney(amountMinor, "NGN")} />
              <ReviewRow label="Reason" value={reason.trim()} />
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
        {feedback ? <FeedbackBanner feedback={feedback} /> : null}
      </Card>

      <Card title="Transfer lifecycle">
        <div className="grid gap-3">
          {transfers.length ? (
            transfers.map((transfer) => (
              <div className="rounded-2xl border border-border p-4" key={transfer.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {transfer.recipient.name} · {formatMoney(transfer.amountMinor, transfer.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {transfer.reference} · {formatDate(transfer.initiatedAt)}
                    </p>
                  </div>
                  <Status status={transfer.status} />
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
            <EmptyState text="No manual transfers have been created." />
          )}
        </div>
      </Card>
    </div>
  );
}

function Card({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-7">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  const idByLabel: Record<string, string> = {
    "Account number": "finance-account-number",
    "Amount (NGN)": "transfer-amount",
    Bank: "finance-bank",
    Reason: "transfer-reason",
    Recipient: "transfer-recipient",
    "Recipient label": "finance-recipient-name",
  };
  return (
    <div className="mt-5">
      <label className="mb-2 block text-sm font-semibold" htmlFor={idByLabel[label]}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-4 font-serif text-2xl font-medium">{value}</p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const warning = [
    "amount_mismatch",
    "currency_mismatch",
    "failed",
    "local_only",
    "needs_reconciliation",
    "provider_only",
    "reversed",
    "status_mismatch",
  ].includes(status);
  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
        warning
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      }`}
    >
      {humanStatus(status)}
    </span>
  );
}

function FeedbackBanner({ feedback }: { feedback: Exclude<Feedback, null> }) {
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-2xl border p-4 text-sm ${
        feedback.tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
      role={feedback.tone === "error" ? "alert" : "status"}
    >
      {feedback.tone === "error" ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      {feedback.text}
    </div>
  );
}

function EmptyState({ text, tone = "neutral" }: { text: string; tone?: "error" | "neutral" }) {
  return (
    <div
      className={`rounded-2xl border border-dashed p-8 text-center text-sm ${
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatSignedMoney(amountMinor: number, currency: string) {
  return `${amountMinor >= 0 ? "+" : "-"}${formatMoney(Math.abs(amountMinor), currency)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toMinorUnits(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  const minor = Math.round(amount * 100);
  return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(minor) ? minor : null;
}

function humanStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
