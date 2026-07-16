import type { ReturnWorkspaceSummary } from "@/features/admin/returns/return-types";
import { formatCompactNaira } from "@/lib/admin/shared/formatters";
import { cn } from "@/lib/utils";

export function ReturnsSummaryStrip({ summary }: { summary: ReturnWorkspaceSummary }) {
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
          className={cn(
            "min-w-0 border-border p-4 sm:border-r sm:p-5",
            index % 2 === 0 && index < 4 ? "border-r" : "",
            index >= 2 ? "border-t sm:border-t-0" : "",
            index === 4 ? "col-span-2 border-t sm:col-span-1 sm:border-r-0 sm:border-t-0" : "",
          )}
          key={label}
        >
          <p className="truncate font-serif text-[24px] font-medium tabular-nums">{value}</p>
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
        </div>
      ))}
    </section>
  );
}
