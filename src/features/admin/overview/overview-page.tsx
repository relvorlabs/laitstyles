import { ArrowRight01Icon, Search01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ActivityStream } from "@/features/admin/overview/activity-stream";
import { AttentionQueue } from "@/features/admin/overview/attention-queue";
import { ContinueWorking } from "@/features/admin/overview/continue-working";
import { FulfilmentLane } from "@/features/admin/overview/fulfilment-lane";
import { InventoryWatch } from "@/features/admin/overview/inventory-watch";
import { OpenOrdersPreview } from "@/features/admin/overview/open-orders-preview";
import { SalesPulse } from "@/features/admin/overview/sales-pulse";
import { TodayStrip } from "@/features/admin/overview/today-strip";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatReportingDate } from "@/lib/control-room/formatters";
import { getOverviewSnapshot } from "@/lib/control-room/selectors";
import type { ControlRoomState } from "@/lib/control-room/types";

export function OverviewPage({ state }: { state: ControlRoomState }) {
  const snapshot = getOverviewSnapshot(state);
  const reportingLabel = formatReportingDate(state.reportingDate);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Owner operations · {reportingLabel}
          </p>
          <h1 className="mt-3 max-w-[820px] text-balance font-serif text-[38px] font-medium leading-[1.01] sm:text-[48px] lg:text-[54px]">
            See the store clearly before deciding what to do next.
          </h1>
          <p className="mt-4 max-w-[700px] text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
            One operating view for store health, customer promises and the next decisions—not a wall
            of repeated dashboard cards.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <a
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-11 rounded-full px-4",
            })}
            href="#attention"
          >
            <AdminIcon icon={Search01Icon} size={16} />
            Review attention
          </a>
          <Link
            className={buttonVariants({
              size: "lg",
              className: "h-11 rounded-full px-4 text-white",
            })}
            href="/"
          >
            <AdminIcon icon={Store01Icon} size={16} />
            Preview storefront
            <AdminIcon icon={ArrowRight01Icon} size={15} />
          </Link>
        </div>
      </section>

      <TodayStrip reportingLabel={reportingLabel} snapshot={snapshot} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)] xl:items-start">
        <div className="order-1 xl:col-start-1 xl:row-start-1">
          <AttentionQueue items={snapshot.attention} />
        </div>

        <div className="order-2 xl:col-start-2 xl:row-start-1">
          <ContinueWorking task={snapshot.continueTask} />
        </div>

        <div className="order-3 xl:col-start-1 xl:row-start-2">
          <OpenOrdersPreview state={state} />
        </div>

        <div className="order-4 xl:col-start-2 xl:row-start-2">
          <FulfilmentLane items={snapshot.fulfilment} />
        </div>

        <div className="order-5 xl:col-start-1 xl:row-start-3">
          <SalesPulse points={state.salesPulse} />
        </div>

        <div className="order-6 xl:col-start-1 xl:row-start-4">
          <InventoryWatch
            lowStock={snapshot.lowStockProducts}
            unpublished={snapshot.unpublishedProducts}
          />
        </div>

        <div className="order-7 xl:col-start-2 xl:row-span-2 xl:row-start-3">
          <ActivityStream activities={snapshot.recentActivities} asOf={state.asOf} />
        </div>
      </div>
    </div>
  );
}
