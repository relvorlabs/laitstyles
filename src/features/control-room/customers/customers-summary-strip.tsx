import { Card } from "@/components/ui/card";
import type { CustomerWorkspaceSummary } from "@/features/control-room/customers/customer-types";
import { formatNaira } from "@/lib/control-room/formatters";

export function CustomersSummaryStrip({ summary }: { summary: CustomerWorkspaceSummary }) {
  const items = [
    {
      label: "Customer relationships",
      value: String(summary.totalCustomers),
      detail: "Connected profiles",
    },
    {
      label: "Relationship value",
      value: formatNaira(summary.relationshipValue),
      detail: "Net paid spend",
    },
    {
      label: "Needs attention",
      value: String(summary.needsAttention),
      detail: "Follow-up contexts",
    },
    {
      label: "Returning",
      value: String(summary.returningCustomers),
      detail: "2+ connected orders",
    },
    {
      label: "Active holds",
      value: String(summary.activeHolds),
      detail: "Reserved now",
    },
  ];

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="grid grid-cols-2 md:grid-cols-5">
        {items.map((item) => (
          <div
            className="min-w-0 border-border p-4 even:border-l md:border-l md:first:border-l-0 md:p-5 max-md:[&:nth-child(n+3)]:border-t"
            key={item.label}
          >
            <p className="truncate font-serif text-[25px] font-medium leading-none tabular-nums sm:text-[28px]">
              {item.value}
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
