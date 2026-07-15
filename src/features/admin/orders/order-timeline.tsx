import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { formatOrderDate, orderStatusLabels } from "@/features/admin/orders/order-labels";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { ControlRoomOrder } from "@/lib/admin/types";

export function OrderTimeline({ order }: { order: ControlRoomOrder }) {
  const timeline = order.timeline?.length
    ? order.timeline
    : [
        {
          id: `${order.id}-placed`,
          status: order.fulfilmentStatus,
          occurredAt: order.placedAt,
          actor: "Store record",
          note: "The current seed record begins at this known operational status.",
        },
      ];

  return (
    <ol className="space-y-0">
      {timeline.toReversed().map((event, index) => (
        <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3" key={event.id}>
          <div className="flex flex-col items-center">
            <span className="grid size-7 place-items-center rounded-full border border-chip-border bg-surface-selected-muted text-surface-selected-foreground">
              <AdminIcon icon={CheckmarkCircle02Icon} size={15} />
            </span>
            {index < timeline.length - 1 ? (
              <span className="min-h-10 w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold capitalize">
                {orderStatusLabels[event.status]}
              </p>
              <time className="text-[10.5px] text-muted-foreground">
                {formatOrderDate(event.occurredAt)}
              </time>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {event.actor} · {event.note}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
