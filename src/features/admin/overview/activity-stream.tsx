import {
  Clock01Icon,
  PackageIcon,
  ShoppingBag01Icon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatRelativeTime } from "@/lib/admin/shared/formatters";
import type { ActivityKind, ControlRoomActivity } from "@/lib/admin/shared/types";

export function ActivityStream({
  activities,
  asOf,
}: {
  activities: ControlRoomActivity[];
  asOf: string;
}) {
  return (
    <Card className="h-full gap-0 py-0">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="font-serif text-[27px] font-medium">What changed recently</CardTitle>
        <CardDescription className="text-[12.5px] leading-5">
          A single timeline across stock, sales, holds and delivery.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length ? (
          <ol className="divide-y divide-border">
            {activities.map((activity) => (
              <li
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-5 py-4 sm:px-6"
                key={activity.id}
              >
                <span className="grid size-9 place-items-center rounded-[11px] bg-accent text-accent-foreground">
                  <AdminIcon icon={activityIcon(activity.kind)} size={17} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-[13px] font-semibold leading-5 sm:text-[13.5px]">
                      {activity.title}
                    </h3>
                    <time
                      className="shrink-0 text-[10.5px] font-medium text-muted-foreground"
                      dateTime={activity.occurredAt}
                    >
                      {formatRelativeTime(asOf, activity.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground sm:text-[12px]">
                    {activity.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center px-5 text-center text-[13px] leading-5 text-muted-foreground">
            Product, order and customer activity will appear here as the store begins moving.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function activityIcon(kind: ActivityKind) {
  if (kind === "order") return ShoppingBag01Icon;
  if (kind === "hold") return Clock01Icon;
  if (kind === "delivery") return TruckDeliveryIcon;
  return PackageIcon;
}
