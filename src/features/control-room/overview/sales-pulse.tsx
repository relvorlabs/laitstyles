import { ChartIncreaseIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatCompactNaira } from "@/lib/control-room/formatters";
import type { SalesPulsePoint } from "@/lib/control-room/types";

type SalesPulseProps = {
  points: SalesPulsePoint[];
};

export function SalesPulse({ points }: SalesPulseProps) {
  const maximum = Math.max(
    ...points.map((point) => point.online + point.offline),
    1,
  );
  const onlineTotal = points.reduce((total, point) => total + point.online, 0);
  const offlineTotal = points.reduce((total, point) => total + point.offline, 0);

  return (
    <Card className="h-full scroll-mt-24 gap-0 py-0" id="sales-pulse">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sales pulse
            </span>
            <span className="mt-1.5 block font-serif text-[27px] font-medium">
              Revenue has two storefronts.
            </span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-secondary text-[#4A5540]">
            <ControlRoomIcon icon={ChartIncreaseIcon} size={20} />
          </span>
        </CardTitle>
        <CardDescription className="mt-2 max-w-[520px] text-[12.5px] leading-5">
          Online orders and owner-recorded sales share the same seven-day view.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">
            Online {formatCompactNaira(onlineTotal)}
          </Badge>
          <Badge className="bg-[#E7EBDD] text-[#4A5540]" variant="secondary">
            Offline {formatCompactNaira(offlineTotal)}
          </Badge>
        </div>

        {points.length ? (
          <>
            <div
              aria-label="Seven-day sales chart comparing online and offline revenue"
              className="mt-8 grid h-[220px] grid-cols-7 items-end gap-2 sm:gap-3"
              role="img"
            >
              {points.map((point) => {
                const onlineHeight = Math.max(6, (point.online / maximum) * 170);
                const offlineHeight = Math.max(4, (point.offline / maximum) * 170);
                const total = point.online + point.offline;

                return (
                  <div
                    className="group flex h-full min-w-0 flex-col justify-end"
                    key={point.date}
                  >
                    <div className="mb-2 hidden text-center text-[9px] font-semibold tabular-nums text-muted-foreground group-hover:block sm:text-[10px]">
                      {formatCompactNaira(total)}
                    </div>
                    <div className="flex h-[174px] items-end justify-center gap-1 rounded-t-[12px] bg-secondary/50 px-1.5 pt-2">
                      <span
                        aria-hidden="true"
                        className="w-[38%] rounded-t-[6px] bg-primary"
                        style={{ height: `${onlineHeight}px` }}
                      />
                      <span
                        aria-hidden="true"
                        className="w-[38%] rounded-t-[6px] bg-accent"
                        style={{ height: `${offlineHeight}px` }}
                      />
                    </div>
                    <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {point.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <ul className="sr-only">
              {points.map((point) => (
                <li key={point.date}>
                  {point.label}: {formatCompactNaira(point.online)} online and{" "}
                  {formatCompactNaira(point.offline)} offline.
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-8 flex min-h-[220px] items-center justify-center rounded-[14px] border border-dashed border-border bg-secondary/35 px-5 text-center text-[13px] leading-5 text-muted-foreground">
            Revenue will appear after the first online or offline sale.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
