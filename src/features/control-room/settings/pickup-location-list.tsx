"use client";

import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  SettingsTextField,
  SettingsTextareaField,
} from "@/features/control-room/settings/settings-fields";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

export function PickupLocationList() {
  const { control } = useFormContext<SaveStoreSettingsInput>();
  const pickups = useFieldArray({
    control,
    name: "delivery.pickupLocations",
  });
  const pickupLocations = useWatch({
    control,
    name: "delivery.pickupLocations",
  }) as SaveStoreSettingsInput["delivery"]["pickupLocations"];

  return (
    <div className="border-t border-border pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Pickup locations</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Give customers a clear collection point and useful instructions.
          </p>
        </div>
        <Button
          onClick={() =>
            pickups.append({
              id: `pickup-location-${crypto.randomUUID()}`,
              name: "",
              address: "",
              city: "",
              instructions: "",
              enabled: true,
            })
          }
          type="button"
          variant="outline"
        >
          Add pickup location
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {pickups.fields.length ? (
          pickups.fields.map((pickup, index) => {
            const base = `delivery.pickupLocations.${index}` as const;
            const current = pickupLocations?.[index];
            return (
              <Card className="gap-5 p-4 sm:p-5" key={pickup.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {current?.name || `Pickup location ${index + 1}`}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      Pickup remains a customer choice only while enabled.
                    </p>
                  </div>
                  <Button
                    onClick={() => pickups.remove(index)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsTextField
                    label="Location name"
                    name={`${base}.name` as FieldPath<SaveStoreSettingsInput>}
                    placeholder="Ikeja studio pickup"
                  />
                  <SettingsTextField
                    label="City"
                    name={`${base}.city` as FieldPath<SaveStoreSettingsInput>}
                    placeholder="Ikeja"
                  />
                  <div className="sm:col-span-2">
                    <SettingsTextField
                      autoComplete="street-address"
                      label="Pickup address"
                      name={`${base}.address` as FieldPath<SaveStoreSettingsInput>}
                      placeholder="14 Allen Avenue"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <SettingsTextareaField
                      label="Pickup instructions"
                      name={`${base}.instructions` as FieldPath<SaveStoreSettingsInput>}
                      placeholder="Pickup is available after order confirmation."
                      rows={3}
                    />
                  </div>
                </div>
                <Controller
                  control={control}
                  name={`${base}.enabled` as FieldPath<SaveStoreSettingsInput>}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        aria-label={`Offer ${current?.name || `pickup location ${index + 1}`}`}
                        checked={Boolean(field.value)}
                        onCheckedChange={(checked) =>
                          field.onChange(Boolean(checked))
                        }
                      />
                      <div>
                        <FieldLabel>Offer pickup here</FieldLabel>
                        <FieldDescription>
                          The address remains in this record while pickup is unavailable.
                        </FieldDescription>
                      </div>
                    </Field>
                  )}
                />
              </Card>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No pickup location is configured. Delivery zones can still remain available.
          </div>
        )}
      </div>
    </div>
  );
}
