import { LedgerLeadFigure } from "@/features/admin/overview/ledger-lead-figure";
import { formatCompactNaira } from "@/lib/admin/shared/formatters";
import type { OverviewSnapshot } from "@/lib/admin/shared/types";
import { cn } from "@/lib/utils";

type TodayStripProps = {
  snapshot: OverviewSnapshot;
  reportingLabel: string;
};

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E";

export function TodayStrip({ snapshot, reportingLabel }: TodayStripProps) {
  const offlineShare = snapshot.revenue.total
    ? Math.round((snapshot.revenue.offline / snapshot.revenue.total) * 100)
    : 0;

  const figures = [
    { label: "Orders", value: String(snapshot.ordersToday) },
    { label: "Units sold", value: String(snapshot.unitsSoldToday) },
    { label: "Active holds", value: String(snapshot.activeHolds) },
    { label: "Offline share", value: `${offlineShare}%` },
  ];

  return (
    <section
      aria-labelledby="today-heading"
      className="relative overflow-hidden border-y border-border bg-surface-sunken/45"
      id="today"
      style={{ animation: "leemRise 300ms var(--ease) both" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("${GRAIN}")` }}
      />

      <div className="relative px-5 py-6 sm:px-7 sm:py-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Today — the lead · {reportingLabel}
        </p>
        <h2
          className="mt-3 max-w-[680px] text-balance font-serif text-[30px] font-medium leading-[1.05] sm:text-[40px]"
          id="today-heading"
        >
          <LedgerLeadFigure value={snapshot.revenue.total} /> moved through the store today.
        </h2>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,.85fr)] xl:items-end">
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
            {figures.map((figure, index) => (
              <div
                className={cn("min-w-0", index > 0 && "sm:border-l sm:border-border sm:pl-5")}
                key={figure.label}
              >
                <div className="font-serif text-[27px] font-medium leading-none tabular-nums">
                  {figure.value}
                </div>
                <div className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {figure.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid content-end gap-2.5">
            <ChannelRow label="Online" value={formatCompactNaira(snapshot.revenue.online)} />
            <ChannelRow label="Offline" value={formatCompactNaira(snapshot.revenue.offline)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ChannelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="min-w-6 flex-1 border-b border-dotted border-border-strong/70"
      />
      <span className="text-[15px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}
