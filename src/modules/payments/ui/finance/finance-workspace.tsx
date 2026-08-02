"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  financeLedgerQueryOptions,
  financeOverviewQueryOptions,
  financeSettlementsQueryOptions,
  payoutBanksQueryOptions,
  payoutRecipientsQueryOptions,
  payoutTransfersQueryOptions,
  useReconcileFinance,
} from "@/modules/payments/client/finance";
import type { ReconciliationRecord } from "@/modules/payments/finance-contract";
import {
  FinanceLedgerPanel,
  FinanceOverviewPanel,
  FinanceSettlementsPanel,
} from "@/modules/payments/ui/finance/finance-read-panels";
import { FinanceRecipientsPanel } from "@/modules/payments/ui/finance/finance-recipients-panel";
import { FinanceTransfersPanel } from "@/modules/payments/ui/finance/finance-transfers-panel";
import {
  type FinanceFeedback,
  FinanceFeedbackBanner,
  humanFinanceStatus,
  readableFinanceError,
} from "@/modules/payments/ui/finance/finance-ui";

type Section = "ledger" | "overview" | "recipients" | "settlements" | "transfers";

export function FinanceWorkspace({ canTransfer }: { canTransfer: boolean }) {
  const [section, setSection] = useState<Section>("overview");
  const [feedback, setFeedback] = useState<FinanceFeedback>(null);
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
      setFeedback({
        tone: "error",
        text: readableFinanceError(error, "Finance reconciliation failed."),
      });
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
        {(["overview", "ledger", "settlements", "recipients", "transfers"] as const).map((item) => (
          <Button
            aria-current={section === item ? "page" : undefined}
            key={item}
            onClick={() => setSection(item)}
            size="sm"
            type="button"
            variant={section === item ? "default" : "outline"}
          >
            {humanFinanceStatus(item)}
          </Button>
        ))}
      </nav>

      {feedback ? <FinanceFeedbackBanner feedback={feedback} /> : null}
      {section === "overview" ? (
        <FinanceOverviewPanel
          data={overview.data}
          isError={overview.isError}
          isPending={overview.isPending}
          reconciliation={reconciliation}
        />
      ) : null}
      {section === "ledger" ? (
        <FinanceLedgerPanel
          isError={ledger.isError}
          isPending={ledger.isPending}
          rows={ledger.data?.items ?? []}
        />
      ) : null}
      {section === "settlements" ? (
        <FinanceSettlementsPanel
          isError={settlements.isError}
          isPending={settlements.isPending}
          rows={settlements.data?.items ?? []}
        />
      ) : null}
      {section === "recipients" ? (
        <FinanceRecipientsPanel
          banks={banks.data ?? []}
          canTransfer={canTransfer}
          isPending={recipients.isPending}
          recipients={recipients.data?.items ?? []}
        />
      ) : null}
      {section === "transfers" ? (
        <FinanceTransfersPanel
          canTransfer={canTransfer}
          recipients={recipients.data?.items ?? []}
          transfers={transfers.data?.items ?? []}
        />
      ) : null}
    </main>
  );
}
