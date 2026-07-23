import { formatRelativeTime } from "@/lib/admin/shared/formatters";
import type { ControlRoomActivity } from "@/lib/admin/shared/types";

export function ActivityStream({
  activities,
  asOf,
}: {
  activities: ControlRoomActivity[];
  asOf: string;
}) {
  return (
    <section aria-labelledby="activity-heading" className="border-t border-border pt-6">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Activity
      </p>
      <h2 className="mt-1.5 font-serif text-[24px] font-medium leading-tight" id="activity-heading">
        What changed recently
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">
        A single timeline across stock, sales, holds and delivery.
      </p>

      {activities.length ? (
        <ol className="mt-3 divide-y divide-border">
          {activities.map((activity) => (
            <li
              className="grid grid-cols-[minmax(48px,auto)_minmax(0,1fr)] gap-3 py-3"
              key={activity.id}
            >
              <time
                className="whitespace-nowrap pt-0.5 font-mono text-[10px] font-semibold text-muted-foreground"
                dateTime={activity.occurredAt}
              >
                {formatRelativeTime(asOf, activity.occurredAt)}
              </time>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold leading-5">{activity.title}</h3>
                <p className="mt-0.5 text-[11.5px] leading-5 text-muted-foreground">
                  {activity.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-[12.5px] leading-5 text-muted-foreground">
          Product, order and customer activity will appear here as the store begins moving.
        </p>
      )}
    </section>
  );
}
