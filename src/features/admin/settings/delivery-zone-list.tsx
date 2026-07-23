"use client";

import {
  Controller,
  type FieldPath,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { SettingsNumberField, SettingsTextField } from "@/features/admin/settings/settings-fields";
import type { SaveStoreSettingsInput } from "@/lib/admin/shared/types";

export function DeliveryZoneList() {
  const { control } = useFormContext<SaveStoreSettingsInput>();
  const zones = useFieldArray({
    control,
    name: "delivery.zones",
    keyName: "fieldKey",
  });
  const delivery = useWatch({
    control,
    name: "delivery",
  }) as SaveStoreSettingsInput["delivery"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Delivery zones</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Group destinations that share a rate and expected delivery time.
          </p>
        </div>
        <Button
          onClick={() =>
            zones.append({
              id: `delivery-zone-${crypto.randomUUID()}`,
              name: "",
              rate: 0,
              estimatedMinDays: 1,
              estimatedMaxDays: 3,
              enabled: true,
            })
          }
          type="button"
          variant="outline"
        >
          Add delivery zone
        </Button>
      </div>

      <div className="space-y-3">
        {zones.fields.map((zone, index) => {
          const base = `delivery.zones.${index}` as const;
          const current = delivery?.zones?.[index];
          const canRemove = zones.fields.length > 1 || Boolean(delivery?.pickupLocations?.length);
          return (
            <Card className="gap-5 p-4 sm:p-5" key={zone.fieldKey}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {current?.name || `Delivery zone ${index + 1}`}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Customers see the zone name, price and estimated timing.
                  </p>
                </div>
                <Button
                  disabled={!canRemove}
                  onClick={() => zones.remove(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsTextField
                  label="Zone name"
                  name={`${base}.name` as FieldPath<SaveStoreSettingsInput>}
                  placeholder="Lagos mainland"
                />
                <SettingsNumberField
                  label="Delivery rate"
                  max={1000000}
                  min={0}
                  name={`${base}.rate` as FieldPath<SaveStoreSettingsInput>}
                  suffix="NGN"
                />
                <SettingsNumberField
                  label="Earliest arrival"
                  max={60}
                  min={1}
                  name={`${base}.estimatedMinDays` as FieldPath<SaveStoreSettingsInput>}
                  suffix="days"
                />
                <SettingsNumberField
                  label="Latest arrival"
                  max={60}
                  min={1}
                  name={`${base}.estimatedMaxDays` as FieldPath<SaveStoreSettingsInput>}
                  suffix="days"
                />
              </div>
              <Controller
                control={control}
                name={`${base}.enabled` as FieldPath<SaveStoreSettingsInput>}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      aria-label={`Offer ${current?.name || `delivery zone ${index + 1}`}`}
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                    <div>
                      <FieldLabel>Offer this delivery option</FieldLabel>
                      <FieldDescription>
                        Disabled zones remain in the form but are not presented as available.
                      </FieldDescription>
                    </div>
                  </Field>
                )}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
