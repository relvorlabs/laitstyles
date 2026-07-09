import { Badge } from "@/components/ui/badge";
import { inventoryHealthLabels } from "@/features/control-room/inventory/inventory-labels";
import type { InventoryHealth } from "@/lib/control-room/types";
import { cn } from "@/lib/utils";

const healthStyles: Record<InventoryHealth, string> = {
  healthy: "bg-[#E7EBDD] text-[#4A5540]",
  "low-stock": "bg-[#F5EBD7] text-[#7A5A20]",
  "out-of-stock": "bg-destructive/10 text-destructive",
  held: "bg-[#E8E3D8] text-[#675F4B]",
  sold: "bg-primary text-primary-foreground",
  draft: "bg-secondary text-foreground",
  intake: "bg-[#E7EBDD] text-[#4A5540]",
  archived: "bg-muted text-muted-foreground",
  unpublished: "bg-[#F1ECE3] text-[#6B5B47]",
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
