import { Card } from "@/components/ui/card";
import type { HoldWorkspaceSummary } from "@/features/control-room/holds/hold-types";

export function HoldsSummaryStrip({ summary }: { summary: HoldWorkspaceSummary }) {
  const metrics = [
    { label: "Holds", value: String(summary.totalHolds) },
    { label: "Active", value: String(summary.activeHolds) },
    { label: "Expiring", value: String(summary.expiringHolds) },
    { label: "Payment risk", value: String(summary.paymentRisk) },
    { label: "Expired", value: String(summary.expiredHolds) },
    { label: "Reserved units", value: String(summary.reservedUnits) },
  ];

  return (
    <Card className="grid grid-cols-2 gap-0 overflow-hidden py-0 sm:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div
          className="border-r border-b border-border px-4 py-5 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 sm:px-5 sm:even:border-r sm:[&:nth-child(3n)]:border-r-0 sm:[&:nth-last-child(-n+3)]:border-b-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:last:border-r-0"
          key={metric.label}
        >
          <div className="font-serif text-[27px] font-medium leading-none tabular-nums sm:text-[28px]">
            {metric.value}
          </div>
          <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground sm:text-[9.5px]">
            {metric.label}
          </div>
        </div>
      ))}
    </Card>
  );
}
