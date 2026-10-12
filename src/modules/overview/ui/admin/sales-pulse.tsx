import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactNaira } from "@/lib/admin/shared/formatters";
import type { SalesPulsePoint } from "@/lib/admin/shared/types";

type SalesPulseProps = {
  points: SalesPulsePoint[];
};

export function SalesPulse({ points }: SalesPulseProps) {
  const maximum = Math.max(...points.map((point) => point.online + point.offline), 1);
  const onlineTotal = points.reduce((total, point) => total + point.online, 0);
  const offlineTotal = points.reduce((total, point) => total + point.offline, 0);

  return (
    <Card className="h-full scroll-mt-24 gap-0 py-0" id="sales-pulse">
      <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
        <CardTitle>
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sales pulse
          </span>
          <span className="mt-1.5 block font-serif text-[27px] font-medium">
            Revenue has two storefronts.
          </span>
        </CardTitle>
        <CardDescription className="mt-2 max-w-[520px] text-[12.5px] leading-5">
          Online orders and owner-recorded sales share the same seven-day view.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <LegendEntry
            label="Online"
            swatchClassName="bg-chart-5"
            value={formatCompactNaira(onlineTotal)}
          />
          <LegendEntry
            label="Offline"
            swatchClassName="bg-chart-2"
            value={formatCompactNaira(offlineTotal)}
          />
        </div>

        {points.length ? (
          <>
            <div
              aria-label="Seven-day sales chart comparing online and offline revenue"
              className="mt-8"
              role="img"
            >
              <div className="grid grid-cols-7 items-end gap-2 border-b border-border sm:gap-3">
                {points.map((point) => {
                  const onlineHeight = Math.max(6, (point.online / maximum) * 170);
                  const offlineHeight = Math.max(4, (point.offline / maximum) * 170);
                  const total = point.online + point.offline;

                  return (
                    <div
                      className="group flex h-[196px] min-w-0 flex-col justify-end"
                      key={point.date}
                    >
                      <div className="mb-2 hidden text-center text-[9px] font-semibold tabular-nums text-muted-foreground group-hover:block sm:text-[10px]">
                        {formatCompactNaira(total)}
                      </div>
                      <div className="flex items-end justify-center gap-1 px-1.5">
                        <span
                          aria-hidden="true"
                          className="w-[38%] rounded-t-[4px] bg-chart-5"
                          style={{ height: `${onlineHeight}px` }}
                        />
                        <span
                          aria-hidden="true"
                          className="w-[38%] rounded-t-[4px] bg-chart-2"
                          style={{ height: `${offlineHeight}px` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {points.map((point) => (
                  <div
                    className="mt-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    key={point.date}
                  >
                    {point.label}
                  </div>
                ))}
              </div>
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
          <div className="mt-8 flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border bg-secondary/35 px-5 text-center text-[13px] leading-5 text-muted-foreground">
            Revenue will appear after the first online or offline sale.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegendEntry({
  label,
  value,
  swatchClassName,
}: {
  label: string;
  value: string;
  swatchClassName: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span aria-hidden="true" className={`size-2 self-center rounded-full ${swatchClassName}`} />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </span>
  );
}
