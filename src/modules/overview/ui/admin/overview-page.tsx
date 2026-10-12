"use client";

import { ArrowRight01Icon, Search01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { ActivityStream } from "@/modules/overview/ui/admin/activity-stream";
import { AttentionQueue } from "@/modules/overview/ui/admin/attention-queue";
import { ContinueWorking } from "@/modules/overview/ui/admin/continue-working";
import { FulfilmentLane } from "@/modules/overview/ui/admin/fulfilment-lane";
import { InventoryWatch } from "@/modules/overview/ui/admin/inventory-watch";
import { OpenOrdersPreview } from "@/modules/overview/ui/admin/open-orders-preview";
import { SalesPulse } from "@/modules/overview/ui/admin/sales-pulse";
import { TodayStrip } from "@/modules/overview/ui/admin/today-strip";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatReportingDate } from "@/lib/admin/shared/formatters";
import { adminOverviewQueryOptions } from "@/modules/overview/client/hooks";

export function OverviewPage() {
  const overviewQuery = useQuery(adminOverviewQueryOptions());

  // #region debug-point B,D,E:overview-render-state
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "B,D,E", location: "src/modules/overview/ui/admin/overview-page.tsx:OverviewPage", msg: "[DEBUG] Overview render state observed", data: { status: overviewQuery.status, fetchStatus: overviewQuery.fetchStatus, isPending: overviewQuery.isPending, isFetching: overviewQuery.isFetching, isError: overviewQuery.isError, hasData: Boolean(overviewQuery.data), errorName: overviewQuery.error instanceof Error ? overviewQuery.error.name : null, errorMessage: overviewQuery.error instanceof Error ? overviewQuery.error.message : null, dataUpdatedAt: overviewQuery.dataUpdatedAt, failureCount: overviewQuery.failureCount }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  if (overviewQuery.isPending) {
    return (
      <p className="mx-auto w-full max-w-[1480px] px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:px-8">
        Loading the persisted operating view…
      </p>
    );
  }
  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <Alert className="mx-auto mt-10 w-[min(92vw,900px)]" variant="destructive">
        <AlertTitle>Overview could not be loaded</AlertTitle>
        <AlertDescription>
          {overviewQuery.error instanceof Error
            ? overviewQuery.error.message
            : "Refresh and try loading the persisted operating view again."}
        </AlertDescription>
      </Alert>
    );
  }

  const data = overviewQuery.data;
  const snapshot = data.snapshot;
  const reportingLabel = formatReportingDate(data.reportingDate);
  const attentionCount = snapshot.attention.length;

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Owner operations · {reportingLabel}
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-success-surface-foreground">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
              Storefront live
            </span>
          </div>
          <h1 className="mt-3 max-w-[820px] text-balance font-serif text-[38px] font-medium leading-[1.01] tracking-[-0.025em] sm:text-[48px] lg:text-[54px]">
            The store, before you decide <em>anything</em>.
          </h1>
          <p className="mt-4 max-w-[700px] text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
            One operating view for store health, customer promises and the next decisions—not a wall
            of repeated dashboard cards.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Link
            className={buttonVariants({ variant: "outline", size: "lg" })}
            data-slot="button"
            href="/"
          >
            <AdminIcon icon={Store01Icon} size={16} />
            Preview storefront
          </Link>
          <a className={buttonVariants({ size: "lg" })} data-slot="button" href="#attention">
            <AdminIcon icon={Search01Icon} size={16} />
            Review attention
            {attentionCount ? (
              <span className="rounded-full bg-primary-foreground/15 px-2 text-[11px] font-semibold tabular-nums">
                {attentionCount}
              </span>
            ) : (
              <AdminIcon icon={ArrowRight01Icon} size={15} />
            )}
          </a>
        </div>
      </section>

      <TodayStrip reportingLabel={reportingLabel} snapshot={snapshot} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)] xl:items-start">
        <div className="order-1 xl:col-start-1 xl:row-start-1">
          <AttentionQueue items={snapshot.attention} />
        </div>
        <div className="order-2 xl:col-start-2 xl:row-start-1">
          <ContinueWorking task={snapshot.continueTask} />
        </div>
        <div className="order-3 xl:col-start-1 xl:row-start-2">
          <OpenOrdersPreview asOf={data.asOf} orders={data.openOrders} />
        </div>
        <div className="order-4 xl:col-start-2 xl:row-start-2">
          <FulfilmentLane items={snapshot.fulfilment} />
        </div>
        <div className="order-5 xl:col-start-1 xl:row-start-3">
          <SalesPulse points={data.salesPulse} />
        </div>
        <div className="order-6 xl:col-start-2 xl:row-start-3">
          <InventoryWatch
            lowStock={snapshot.lowStockProducts}
            lowStockCount={snapshot.lowStockCount}
            unpublished={snapshot.unpublishedProducts}
            unpublishedCount={snapshot.unpublishedCount}
          />
        </div>
        <div className="order-7 xl:col-start-2 xl:row-start-4">
          <ActivityStream activities={snapshot.recentActivities} asOf={data.asOf} />
        </div>
      </div>
    </div>
  );
}
