import Link from "next/link";
import {
  ArrowRight01Icon,
  Search01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ui/button";
import { ActivityStream } from "@/features/control-room/overview/activity-stream";
import { AttentionQueue } from "@/features/control-room/overview/attention-queue";
import { ContinueWorking } from "@/features/control-room/overview/continue-working";
import { FulfilmentLane } from "@/features/control-room/overview/fulfilment-lane";
import { InventoryWatch } from "@/features/control-room/overview/inventory-watch";
import { SalesPulse } from "@/features/control-room/overview/sales-pulse";
import { TodayStrip } from "@/features/control-room/overview/today-strip";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatReportingDate } from "@/lib/control-room/formatters";
import { getOverviewSnapshot } from "@/lib/control-room/selectors";
import type { ControlRoomState } from "@/lib/control-room/types";

export function OverviewPage({ state }: { state: ControlRoomState }) {
  const snapshot = getOverviewSnapshot(state);
  const reportingLabel = formatReportingDate(state.reportingDate);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Owner operations · {reportingLabel}
          </p>
          <h1 className="mt-3 max-w-[860px] text-balance font-serif text-[40px] font-medium leading-[.98] sm:text-[54px] lg:text-[62px]">
            See the store clearly before deciding what to do next.
          </h1>
          <p className="mt-5 max-w-[720px] text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
            Revenue, inventory, holds and delivery exceptions are joined into one daily operating view—not separate reports to reconcile.
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
            <ControlRoomIcon icon={Search01Icon} size={16} />
            Review attention
          </a>
          <Link
            className={buttonVariants({
              size: "lg",
              className: "h-11 rounded-full px-4",
            })}
            href="/"
          >
            <ControlRoomIcon icon={Store01Icon} size={16} />
            Preview storefront
            <ControlRoomIcon icon={ArrowRight01Icon} size={15} />
          </Link>
        </div>
      </section>

      <TodayStrip reportingLabel={reportingLabel} snapshot={snapshot} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] xl:items-start">
        <AttentionQueue items={snapshot.attention} />
        <ContinueWorking task={snapshot.continueTask} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
        <SalesPulse points={state.salesPulse} />
        <FulfilmentLane items={snapshot.fulfilment} />
      </div>

      <InventoryWatch
        lowStock={snapshot.lowStockProducts}
        unpublished={snapshot.unpublishedProducts}
      />

      <section>
        <ActivityStream
          activities={snapshot.recentActivities}
          asOf={state.asOf}
        />
      </section>
    </div>
  );
}
