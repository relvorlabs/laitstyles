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
  const { control, setValue } = useFormContext<SaveStoreSettingsInput>();
  const zones = useFieldArray({
    control,
    name: "delivery.zones",
    keyName: "fieldKey",
  });
  const delivery = useWatch({
    control,
    name: "delivery",
  }) as SaveStoreSettingsInput["delivery"];

  function selectNationwideFallback(index: number): void {
    for (const [zoneIndex] of (delivery?.zones ?? []).entries()) {
      setValue(`delivery.zones.${zoneIndex}.isNationwideFallback`, zoneIndex === index, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (zoneIndex === index) {
        setValue(`delivery.zones.${zoneIndex}.enabled`, true, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Delivery pricing</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Delivery is available nationwide. Regional options can override the price, while one
            enabled option must remain the fallback for every other Nigerian address.
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
              isNationwideFallback: false,
            })
          }
          type="button"
          variant="outline"
        >
          Add regional price
        </Button>
      </div>

      <div className="space-y-3">
        {zones.fields.map((zone, index) => {
          const base = `delivery.zones.${index}` as const;
          const current = delivery?.zones?.[index];
          const canRemove = zones.fields.length > 1 && !current?.isNationwideFallback;
          return (
            <Card className="gap-5 p-4 sm:p-5" key={zone.fieldKey}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {current?.name || `Delivery option ${index + 1}`}
                    </p>
                    {current?.isNationwideFallback ? (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
                        Nationwide fallback
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Customers see this name, price, and expected arrival window.
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
                  label="Option name"
                  name={`${base}.name` as FieldPath<SaveStoreSettingsInput>}
                  placeholder="Nationwide delivery"
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
              <div className="grid gap-3 lg:grid-cols-2">
                <Controller
                  control={control}
                  name={`${base}.enabled` as FieldPath<SaveStoreSettingsInput>}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        aria-label={`Offer ${current?.name || `delivery option ${index + 1}`}`}
                        checked={Boolean(field.value)}
                        disabled={Boolean(current?.isNationwideFallback)}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      <div>
                        <FieldLabel>Offer this delivery price</FieldLabel>
                        <FieldDescription>
                          Disabled regional prices are ignored during checkout.
                        </FieldDescription>
                      </div>
                    </Field>
                  )}
                />
                <Field orientation="horizontal">
                  <Checkbox
                    aria-label={`Use ${current?.name || `delivery option ${index + 1}`} nationwide`}
                    checked={Boolean(current?.isNationwideFallback)}
                    onCheckedChange={(checked) => {
                      if (checked) selectNationwideFallback(index);
                    }}
                  />
                  <div>
                    <FieldLabel>Use for the rest of Nigeria</FieldLabel>
                    <FieldDescription>
                      This keeps every valid Nigerian delivery address eligible to pay.
                    </FieldDescription>
                  </div>
                </Field>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
