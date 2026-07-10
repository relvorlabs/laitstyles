import { Badge } from "@/components/ui/badge";
import {
  getReturnStatusTone,
  returnStatusLabels,
} from "@/features/control-room/returns/return-labels";
import type { ReturnStatus } from "@/lib/control-room/types";

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <Badge variant={getReturnStatusTone(status)}>
      {returnStatusLabels[status]}
    </Badge>
  );
}
