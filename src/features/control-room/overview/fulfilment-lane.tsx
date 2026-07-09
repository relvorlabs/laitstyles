import { TruckDeliveryIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type { FulfilmentLaneItem } from "@/lib/control-room/types";

export function FulfilmentLane({ items }: { items: FulfilmentLaneItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-full gap-0 py-0 scroll-mt-24" id="fulfilment">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Fulfilment lane
            </span>
            <span className="mt-1.5 block font-serif text-[27px] font-medium">
              Move paid orders forward.
            </span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-secondary text-[#4A5540]">
            <ControlRoomIcon icon={TruckDeliveryIcon} size={20} />
          </span>
        </CardTitle>
        <CardDescription className="mt-2 text-[12.5px] leading-5">
          {total} order{total === 1 ? "" : "s"} currently between payment and dispatch.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <ol className="grid gap-3 sm:grid-cols-4 sm:gap-2" aria-label="Order fulfilment stages">
          {items.map((item, index) => (
            <li className="relative" key={item.status}>
              <div className="flex min-h-[104px] items-center gap-4 rounded-[14px] border border-border bg-secondary/35 p-4 sm:block sm:min-h-[136px]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-[12px] font-bold tabular-nums ring-1 ring-foreground/10">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 sm:mt-5">
                  <div className="font-serif text-[28px] font-medium leading-none tabular-nums">
                    {item.count}
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </div>
                </div>
                {item.count ? (
                  <Badge variant="secondary">Active</Badge>
                ) : (
                  <Badge variant="outline">Clear</Badge>
                )}
              </div>
              {index < items.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[18px] top-full h-3 w-px bg-border sm:left-full sm:top-[34px] sm:h-px sm:w-2"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
