import {
  Alert02Icon,
  Clock01Icon,
  PackageIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { InventorySummary } from "@/lib/admin/types";

export function InventorySummaryStrip({ summary }: { summary: InventorySummary }) {
  const metrics = [
    {
      label: "Products",
      value: summary.totalProducts,
      detail: `${summary.liveProducts} live`,
      icon: PackageIcon,
    },
    {
      label: "Available units",
      value: summary.availableUnits,
      detail: `${summary.reservedUnits} reserved`,
      icon: Clock01Icon,
    },
    {
      label: "Units sold",
      value: summary.soldUnits,
      detail: "Across every product mode",
      icon: ShoppingBag01Icon,
    },
    {
      label: "Needs attention",
      value: summary.lowStockProducts + summary.outOfStockProducts + summary.intakeProducts,
      detail: `${summary.lowStockProducts} low · ${summary.outOfStockProducts} out · ${summary.intakeProducts} intake`,
      icon: Alert02Icon,
    },
  ] as const;

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="grid p-0 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            className="flex min-h-[118px] items-center gap-4 border-b border-border px-5 py-5 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 sm:[&:nth-child(3)]:border-b-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:[&:nth-child(4)]:border-r-0"
            key={metric.label}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-accent text-accent-foreground">
              <AdminIcon icon={metric.icon} size={20} />
            </span>
            <div className="min-w-0">
              <div className="font-serif text-[30px] font-medium leading-none tabular-nums">
                {metric.value}
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-foreground">
                {metric.label}
              </div>
              <div className="mt-1 truncate text-[11.5px] text-muted-foreground">
                {metric.detail}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
