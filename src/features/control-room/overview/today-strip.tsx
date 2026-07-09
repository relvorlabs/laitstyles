import {
  Clock01Icon,
  PackageIcon,
  ShoppingBag01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatCompactNaira, formatNaira } from "@/lib/control-room/formatters";
import type { OverviewSnapshot } from "@/lib/control-room/types";

type TodayStripProps = {
  snapshot: OverviewSnapshot;
  reportingLabel: string;
};

export function TodayStrip({ snapshot, reportingLabel }: TodayStripProps) {
  const offlineShare = snapshot.revenue.total
    ? Math.round((snapshot.revenue.offline / snapshot.revenue.total) * 100)
    : 0;

  return (
    <Card
      className="relative overflow-hidden border-0 bg-primary py-0 text-primary-foreground ring-0"
      id="today"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-[44%] bg-[radial-gradient(circle_at_70%_20%,rgba(217,225,201,.18),transparent_42%),linear-gradient(135deg,transparent,rgba(255,255,255,.04))]"
      />
      <CardHeader className="relative border-b border-white/10 px-5 py-5 sm:px-7 sm:py-6">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/54">
            Today · {reportingLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-[#D9E1C9]">
            <span className="size-1.5 rounded-full bg-[#AFC48A]" />
            Storefront live
          </span>
        </CardTitle>
        <CardDescription className="mt-5 max-w-[620px] font-serif text-[34px] font-medium leading-[1.03] text-white sm:text-[46px]">
          {formatNaira(snapshot.revenue.total)} moved through the store today.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative px-5 py-6 sm:px-7 sm:py-7">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr] xl:items-end">
          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
              <PulseMetric
                icon={ShoppingBag01Icon}
                label="Orders"
                value={String(snapshot.ordersToday)}
              />
              <PulseMetric
                icon={PackageIcon}
                label="Units sold"
                value={String(snapshot.unitsSoldToday)}
              />
              <PulseMetric
                icon={Clock01Icon}
                label="Active holds"
                value={String(snapshot.activeHolds)}
              />
              <PulseMetric
                icon={Store01Icon}
                label="Offline share"
                value={`${offlineShare}%`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-white/10 bg-white/5">
            <ChannelMetric
              label="Online"
              value={formatCompactNaira(snapshot.revenue.online)}
            />
            <ChannelMetric
              label="Offline"
              value={formatCompactNaira(snapshot.revenue.offline)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type PulseMetricProps = {
  icon: Parameters<typeof ControlRoomIcon>[0]["icon"];
  label: string;
  value: string;
};

function PulseMetric({ icon, label, value }: PulseMetricProps) {
  return (
    <div className="min-w-0">
      <span className="grid size-9 place-items-center rounded-[11px] bg-white/8 text-[#D9E1C9]">
        <ControlRoomIcon icon={icon} size={17} />
      </span>
      <div className="mt-3 font-serif text-[28px] font-medium leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42">
        {label}
      </div>
    </div>
  );
}

function ChannelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-4 py-5 last:border-r-0 sm:px-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-[18px] font-semibold tabular-nums text-white sm:text-[21px]">
        {value}
      </div>
    </div>
  );
}
