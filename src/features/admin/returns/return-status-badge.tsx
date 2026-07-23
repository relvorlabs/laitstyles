import { Badge } from "@/components/ui/badge";
import { getReturnStatusTone, returnStatusLabels } from "@/features/admin/returns/return-labels";
import type { ReturnStatus } from "@/lib/admin/shared/types";

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return <Badge variant={getReturnStatusTone(status)}>{returnStatusLabels[status]}</Badge>;
}
