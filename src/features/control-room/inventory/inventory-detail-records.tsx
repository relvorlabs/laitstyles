import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatInventoryDate } from "@/features/control-room/inventory/inventory-labels";
import { formatNaira } from "@/lib/control-room/formatters";
import type {
  ControlRoomActivity,
  ControlRoomHold,
  ControlRoomOrder,
  ProductReview,
  StockMovement,
} from "@/lib/control-room/types";

export function ProductOrdersPanel({ orders }: { orders: ControlRoomOrder[] }) {
  return (
    <RecordStack empty="No order currently references this product.">
      {orders.map((order) => {
        const quantity = order.lines.reduce((total, line) => total + line.quantity, 0);
        return (
          <RecordCard
            badge={order.fulfilmentStatus.replaceAll("-", " ")}
            detail={`${quantity} unit${quantity === 1 ? "" : "s"} · ${order.deliveryCity}`}
            key={order.id}
            meta={formatInventoryDate(order.placedAt)}
            title={order.id}
            value={formatNaira(order.total)}
          />
        );
      })}
    </RecordStack>
  );
}

export function ProductHoldsPanel({ holds }: { holds: ControlRoomHold[] }) {
  return (
    <RecordStack empty="No active or recorded hold references this product.">
      {holds.map((hold) => (
        <RecordCard
          badge={hold.stage}
          detail={`${hold.quantity} unit${hold.quantity === 1 ? "" : "s"} · ${hold.source}`}
          key={hold.id}
          meta={`Expires ${formatInventoryDate(hold.expiresAt)}`}
          title={hold.customerLabel}
          value="Reserved"
        />
      ))}
    </RecordStack>
  );
}

export function ProductMovementsPanel({
  movements,
}: {
  movements: StockMovement[];
}) {
  return (
    <RecordStack empty="No stock movement has been recorded for this product.">
      {movements.map((movement) => (
        <RecordCard
          badge={movement.kind}
          detail={`${movement.actor} · ${movement.note}`}
          key={movement.id}
          meta={formatInventoryDate(movement.occurredAt)}
          title={`${movement.quantity} unit${movement.quantity === 1 ? "" : "s"}`}
          value={movement.variantId ? "Variant" : "Product"}
        />
      ))}
    </RecordStack>
  );
}

export function ProductReviewsPanel({ reviews }: { reviews: ProductReview[] }) {
  return (
    <RecordStack empty="No review has been attached to this product yet.">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="flex flex-col gap-3 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold">{review.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {formatInventoryDate(review.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{review.rating}/5</Badge>
                <Badge variant="outline">{review.status}</Badge>
              </div>
            </div>
            <p className="text-[12.5px] leading-5 text-muted-foreground">
              {review.body}
            </p>
          </CardContent>
        </Card>
      ))}
    </RecordStack>
  );
}

export function ProductActivityPanel({
  activities,
}: {
  activities: ControlRoomActivity[];
}) {
  return (
    <RecordStack empty="No recent operational activity references this product.">
      {activities.map((activity) => (
        <RecordCard
          badge={activity.kind}
          detail={activity.detail}
          key={activity.id}
          meta={formatInventoryDate(activity.occurredAt)}
          title={activity.title}
          value="Activity"
        />
      ))}
    </RecordStack>
  );
}

function RecordStack({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty: string;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  if (!hasChildren) {
    return (
      <Empty className="min-h-[280px] border border-dashed border-border bg-secondary/25">
        <EmptyHeader>
          <EmptyTitle className="font-serif text-[24px] font-medium">
            Nothing recorded here
          </EmptyTitle>
          <EmptyDescription>{empty}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <div className="flex flex-col gap-3">{children}</div>;
}

type RecordCardProps = {
  title: string;
  detail: string;
  badge: string;
  meta: string;
  value: string;
};

function RecordCard({ title, detail, badge, meta, value }: RecordCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-semibold">{title}</h3>
            <Badge className="capitalize" variant="outline">
              {badge}
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            {detail}
          </p>
        </div>
        <div className="sm:text-right">
          <div className="text-[12px] font-semibold">{value}</div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">{meta}</div>
        </div>
      </CardContent>
    </Card>
  );
}
