import { Card } from "@/components/ui/card";
import { formatCompactNaira } from "@/lib/control-room/formatters";
import type { OrderWorkspaceSummary } from "@/features/control-room/orders/order-types";

export function OrdersSummaryStrip({
  summary,
}: {
  summary: OrderWorkspaceSummary;
}) {
  const metrics = [
    { label: "Orders", value: String(summary.totalOrders) },
    { label: "Needs attention", value: String(summary.needsAttention) },
    { label: "Pending payment", value: String(summary.pendingPayment) },
    { label: "In fulfilment", value: String(summary.inFulfilment) },
    { label: "Delivered", value: String(summary.delivered) },
    { label: "Net revenue", value: formatCompactNaira(summary.netRevenue) },
  ];

  return (
    <Card className="grid gap-0 overflow-hidden py-0 sm:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric, index) => (
        <div
          className="border-b border-border px-5 py-5 last:border-b-0 sm:[&:nth-child(3n)]:border-r-0 sm:[&:nth-last-child(-n+3)]:border-b-0 sm:border-r xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:last:border-r-0"
          key={metric.label}
        >
          <div className="font-serif text-[28px] font-medium leading-none tabular-nums">
            {metric.value}
          </div>
          <div className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {metric.label}
          </div>
          <span className="sr-only">Metric {index + 1}</span>
        </div>
      ))}
    </Card>
  );
}
