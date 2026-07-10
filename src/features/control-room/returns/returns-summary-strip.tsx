import type { ReturnWorkspaceSummary } from "@/features/control-room/returns/return-types";
import { formatCompactNaira } from "@/lib/control-room/formatters";

export function ReturnsSummaryStrip({
  summary,
}: {
  summary: ReturnWorkspaceSummary;
}) {
  const metrics = [
    ["Total", summary.totalReturns],
    ["Open", summary.openReturns],
    ["Awaiting item", summary.awaitingItem],
    ["Inspecting", summary.inspecting],
    ["Return value", formatCompactNaira(summary.refundValue)],
  ] as const;

  return (
    <section
      aria-label="Returns summary"
      className="grid grid-cols-2 overflow-hidden rounded-[18px] border border-border bg-card sm:grid-cols-5"
    >
      {metrics.map(([label, value], index) => (
        <div
          className="min-w-0 border-border p-4 not-last:border-r max-sm:nth-[2n]:border-r-0 max-sm:nth-[n+3]:border-t sm:p-5"
          key={label}
        >
          <p className="truncate font-serif text-[24px] font-medium tabular-nums">
            {value}
          </p>
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
        </div>
      ))}
    </section>
  );
}
