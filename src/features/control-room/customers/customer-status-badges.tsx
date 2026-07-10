import { Badge } from "@/components/ui/badge";
import {
  customerAttentionLabels,
  customerSegmentLabels,
  customerTypeLabels,
} from "@/features/control-room/customers/customer-labels";
import type {
  CustomerAttentionReason,
  CustomerSegment,
  CustomerType,
} from "@/lib/control-room/customer-types";

export function CustomerTypeBadge({ type }: { type: CustomerType | undefined }) {
  const value = type ?? "individual";
  return <Badge variant="outline">{customerTypeLabels[value]}</Badge>;
}

export function CustomerSegmentBadges({
  segments,
}: {
  segments: CustomerSegment[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {segments.map((segment) => (
        <Badge
          key={segment}
          variant={segment === "high-value" ? "secondary" : "outline"}
        >
          {customerSegmentLabels[segment]}
        </Badge>
      ))}
    </div>
  );
}

export function CustomerAttentionBadges({
  attention,
}: {
  attention: CustomerAttentionReason[];
}) {
  if (!attention.length) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {attention.map((reason) => (
        <Badge key={reason} variant="destructive">
          {customerAttentionLabels[reason]}
        </Badge>
      ))}
    </div>
  );
}