"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/control-room/formatters";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

export function DeliveryPreview() {
  const { control } = useFormContext<SaveStoreSettingsInput>();
  const delivery = useWatch({ control, name: "delivery" }) as SaveStoreSettingsInput["delivery"];
  const activeZones = delivery?.zones?.filter((zone) => zone.enabled) ?? [];
  const activePickups =
    delivery?.pickupLocations?.filter((location) => location.enabled) ?? [];

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Checkout choices
        </p>
        <Badge variant="outline">{activeZones.length + activePickups.length} active</Badge>
      </div>
      <div className="space-y-2">
        {activeZones.map((zone) => (
          <div className="rounded-xl border border-border p-3" key={zone.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{zone.name || "Unnamed zone"}</p>
              <p className="shrink-0 text-xs font-medium tabular-nums">
                {formatNaira(Number(zone.rate) || 0)}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {zone.estimatedMinDays}–{zone.estimatedMaxDays} days
            </p>
          </div>
        ))}
        {activePickups.map((pickup) => (
          <div className="rounded-xl border border-border p-3" key={pickup.id}>
            <p className="text-sm font-medium">{pickup.name || "Unnamed pickup"}</p>
            <p className="mt-1 break-words text-[11px] leading-4 text-muted-foreground">
              Pickup · {pickup.city || "City not added"}
            </p>
          </div>
        ))}
        {!activeZones.length && !activePickups.length ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">
            Enable at least one delivery zone or pickup location before saving.
          </div>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Rates and estimates are store promises only. Delivery booking remains outside this preview.
      </p>
    </Card>
  );
}
