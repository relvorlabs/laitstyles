import { Badge } from "@/components/ui/badge";
import { holdRiskLabels } from "@/features/admin/holds/hold-labels";
import type { HoldWorkspaceRisk } from "@/features/admin/holds/hold-types";
import { cn } from "@/lib/utils";

const riskClasses: Record<HoldWorkspaceRisk, string> = {
  stable: "border-brand-sage/40 bg-accent text-accent-foreground",
  expiring: "border-warning/40 bg-warning/18 text-warning-foreground",
  "payment-risk": "border-destructive/35 bg-destructive/12 text-destructive",
  expired: "border-border bg-secondary text-muted-foreground",
  released: "border-border bg-secondary text-muted-foreground",
  converted: "border-success/35 bg-success/12 text-foreground",
};

export function HoldRiskBadge({ risk }: { risk: HoldWorkspaceRisk }) {
  return (
    <Badge className={cn(riskClasses[risk])} variant="outline">
      {holdRiskLabels[risk]}
    </Badge>
  );
}
