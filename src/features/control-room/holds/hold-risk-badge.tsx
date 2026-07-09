import { Badge } from "@/components/ui/badge";
import { holdRiskLabels } from "@/features/control-room/holds/hold-labels";
import type { HoldWorkspaceRisk } from "@/features/control-room/holds/hold-types";
import { cn } from "@/lib/utils";

const riskClasses: Record<HoldWorkspaceRisk, string> = {
  stable: "border-[#CBD2BA] bg-[#E7EBDD] text-[#4A5540]",
  expiring: "border-[#E3D3A0] bg-[#F8F0D7] text-[#745D17]",
  "payment-risk": "border-[#E3B6AE] bg-[#F8E5E1] text-[#8A3F34]",
  expired: "border-border bg-secondary text-muted-foreground",
  released: "border-border bg-secondary text-muted-foreground",
  converted: "border-[#B9D8C0] bg-[#E7F4EA] text-[#356141]",
};

export function HoldRiskBadge({ risk }: { risk: HoldWorkspaceRisk }) {
  return (
    <Badge className={cn(riskClasses[risk])} variant="outline">
      {holdRiskLabels[risk]}
    </Badge>
  );
}
