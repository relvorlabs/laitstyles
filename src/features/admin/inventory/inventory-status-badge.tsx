import { Badge } from "@/components/ui/badge";
import { inventoryHealthLabels } from "@/features/control-room/inventory/inventory-labels";
import type { InventoryHealth } from "@/lib/control-room/types";
import { cn } from "@/lib/utils";

const healthStyles: Record<InventoryHealth, string> = {
  healthy: "bg-success/15 text-success",
  "low-stock": "bg-warning/20 text-warning-foreground",
  "out-of-stock": "bg-destructive/12 text-destructive",
  held: "bg-secondary text-secondary-foreground",
  sold: "bg-primary text-primary-foreground",
  draft: "bg-muted text-muted-foreground",
  intake: "bg-accent text-accent-foreground",
  archived: "bg-muted text-muted-foreground",
  unpublished: "bg-secondary text-secondary-foreground",
};

export function InventoryStatusBadge({
  health,
  className,
}: {
  health: InventoryHealth;
  className?: string;
}) {
  return (
    <Badge
      className={cn("border-transparent", healthStyles[health], className)}
      variant="secondary"
    >
      {inventoryHealthLabels[health]}
    </Badge>
  );
}
