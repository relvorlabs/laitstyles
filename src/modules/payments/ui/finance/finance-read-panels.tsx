"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  financeSettlementTransactionsQueryOptions,
  financeTransactionQueryOptions,
} from "@/modules/payments/client/finance";
import type {
  FinanceLedgerRecord,
  FinanceOverviewRecord,
  ReconciliationRecord,
  SettlementRecord,
} from "@/modules/payments/finance-contract";
import {
  FinanceCard,
  FinanceEmptyState,
  FinanceMetric,
  FinanceStatus,
  formatFinanceDate,
  formatFinanceMoney,
  formatFinanceSignedMoney,
} from "@/modules/payments/ui/finance/finance-ui";

export function FinanceOverviewPanel({
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
  if (isPending) return <FinanceEmptyState text="Loading Paystack finance overview…" />;
  if (isError || !data) {
    return <FinanceEmptyState text="Finance overview could not be loaded." tone="error" />;
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.balances.map((balance) => (
          <FinanceMetric
            key={balance.currency}
            label={`Available ${balance.currency}`}
            value={formatFinanceMoney(balance.availableAmountMinor, balance.currency)}
          />
        ))}
        <FinanceMetric
          label="Captured volume"
          value={formatFinanceMoney(data.totals.totalVolumeMinor, "NGN")}
        />
        <FinanceMetric label="Unresolved transfers" value={String(data.unresolvedTransfers)} />
        <FinanceMetric label="Pending settlements" value={String(data.pendingSettlements)} />
      </div>
      <FinanceCard title="Reconciliation outcomes">
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
                <FinanceStatus status={record.outcome} />
              </div>
            ))
          ) : (
            <FinanceEmptyState text="Run reconciliation to compare provider and local facts." />
          )}
        </div>
      </FinanceCard>
    </div>
  );
}

export function FinanceLedgerPanel({
  isError,
  isPending,
  rows,
}: {
  isError: boolean;
  isPending: boolean;
  rows: FinanceLedgerRecord[];
}) {
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const detail = useQuery(financeTransactionQueryOptions(transactionId));
  if (isPending) return <FinanceEmptyState text="Loading provider ledger…" />;
  if (isError) {
    return <FinanceEmptyState text="Provider ledger could not be loaded." tone="error" />;
  }
  return (
    <div className="grid gap-6">
      <FinanceCard title="Paystack balance ledger">
        <div className="grid gap-3">
          {rows.length ? (
            rows.map((row) => {
              const canInspect =
                row.sourceId !== null && row.sourceType.toLowerCase().includes("transaction");
              return (
                <div
                  className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={row.id}
                >
                  <div>
                    <p className="font-semibold">{row.reason ?? row.sourceType}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.sourceType} · {formatFinanceDate(row.createdAt)}
                    </p>
                    {canInspect ? (
                      <Button
                        className="mt-3"
                        onClick={() => setTransactionId(row.sourceId)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Inspect transaction
                      </Button>
                    ) : null}
                  </div>
                  <div className="sm:text-right">
                    <p className="font-semibold">
                      {formatFinanceSignedMoney(row.differenceMinor, row.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance {formatFinanceMoney(row.balanceMinor, row.currency)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <FinanceEmptyState text="No provider ledger entries were returned." />
          )}
        </div>
      </FinanceCard>
      {transactionId ? (
        <FinanceCard title="Transaction detail">
          {detail.isPending ? <FinanceEmptyState text="Loading transaction timeline…" /> : null}
          {detail.isError ? (
            <FinanceEmptyState text="Transaction detail could not be loaded." tone="error" />
          ) : null}
          {detail.data ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <dl className="grid gap-2 text-sm">
                <DetailRow label="Reference" value={detail.data.provider.reference} />
                <DetailRow
                  label="Amount"
                  value={formatFinanceMoney(
                    detail.data.provider.amountMinor,
                    detail.data.provider.currency,
                  )}
                />
                <DetailRow label="Provider status" value={detail.data.provider.status} />
                <DetailRow label="Order" value={detail.data.local?.orderNumber ?? "No local order"} />
                <DetailRow label="Local status" value={detail.data.local?.localStatus ?? "Missing"} />
              </dl>
              <div>
                <p className="text-sm font-semibold">Provider timeline</p>
                <div className="mt-3 grid gap-2">
                  {detail.data.timeline.history.map((entry, index) => (
                    <div className="rounded-xl border border-border p-3 text-sm" key={`${entry.type}-${index}`}>
                      <p className="font-medium">{entry.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.type} · {entry.elapsedSeconds}s
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </FinanceCard>
      ) : null}
    </div>
  );
}

export function FinanceSettlementsPanel({
  isError,
  isPending,
  rows,
}: {
  isError: boolean;
  isPending: boolean;
  rows: SettlementRecord[];
}) {
  const [settlementId, setSettlementId] = useState<string | null>(null);
  const transactions = useQuery(financeSettlementTransactionsQueryOptions(settlementId));
  if (isPending) return <FinanceEmptyState text="Loading automatic settlements…" />;
  if (isError) return <FinanceEmptyState text="Settlements could not be loaded." tone="error" />;
  return (
    <div className="grid gap-6">
      <FinanceCard title="Automatic Paystack settlements">
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
                    {row.settledAt ? formatFinanceDate(row.settledAt) : "Awaiting settlement date"}
                  </p>
                  <Button
                    className="mt-3"
                    onClick={() => setSettlementId(row.providerSettlementId)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Inspect transactions
                  </Button>
                </div>
                <div className="md:text-right">
                  <p className="font-semibold">
                    {formatFinanceMoney(row.effectiveAmountMinor, row.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fees {formatFinanceMoney(row.totalFeesMinor, row.currency)}
                  </p>
                </div>
                <FinanceStatus status={row.status} />
              </div>
            ))
          ) : (
            <FinanceEmptyState text="No settlements were returned." />
          )}
        </div>
      </FinanceCard>
      {settlementId ? (
        <FinanceCard title={`Settlement ${settlementId} transactions`}>
          {transactions.isPending ? <FinanceEmptyState text="Loading settlement transactions…" /> : null}
          {transactions.isError ? (
            <FinanceEmptyState text="Settlement transactions could not be loaded." tone="error" />
          ) : null}
          <div className="grid gap-3">
            {transactions.data?.items.map((transaction) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-4"
                key={transaction.id}
              >
                <div>
                  <p className="font-semibold">{transaction.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {transaction.orderNumber ?? "No local order"} · {transaction.status}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatFinanceMoney(transaction.amountMinor, transaction.currency)}
                </p>
              </div>
            ))}
          </div>
        </FinanceCard>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
