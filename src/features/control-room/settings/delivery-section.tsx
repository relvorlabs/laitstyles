"use client";

import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  SettingsNumberField,
  SettingsTextField,
  SettingsTextareaField,
} from "@/features/control-room/settings/settings-fields";
import { getSettingsFieldError } from "@/features/control-room/settings/settings-errors";
import { SettingsSectionFrame } from "@/features/control-room/settings/settings-section-frame";
import { formatNaira } from "@/lib/control-room/formatters";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

export function DeliverySection() {
  const {
    control,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const zones = useFieldArray({ control, name: "delivery.zones" });
  const pickups = useFieldArray({ control, name: "delivery.pickupLocations" });
  const delivery = useWatch({ control, name: "delivery" }) as SaveStoreSettingsInput["delivery"];
  const deliveryError = getSettingsFieldError(errors, "delivery.zones");

  return (
    <SettingsSectionFrame
      aside={<DeliveryPreview delivery={delivery} />}
      section="delivery"
    >
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
            return (
              <Card className="gap-5 p-4 sm:p-5" key={zone.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {delivery?.zones?.[index]?.name || `Delivery zone ${index + 1}`}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      Customers see the zone name, price and estimated timing.
                    </p>
                  </div>
                  <Button
                    disabled={zones.fields.length === 1 && pickups.fields.length === 0}
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
                        aria-label={`Offer ${delivery?.zones?.[index]?.name || `delivery zone ${index + 1}`}`}
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
              return (
                <Card className="gap-5 p-4 sm:p-5" key={pickup.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {delivery?.pickupLocations?.[index]?.name || `Pickup location ${index + 1}`}
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
                          aria-label={`Offer ${delivery?.pickupLocations?.[index]?.name || `pickup location ${index + 1}`}`}
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                        <div>
                          <FieldLabel>Offer pickup here</FieldLabel>
                          <FieldDescription>
                            The address remains internal to this record while disabled.
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

      <Field data-invalid={Boolean(deliveryError)}>
        <FieldError>{deliveryError}</FieldError>
      </Field>
    </SettingsSectionFrame>
  );
}

function DeliveryPreview({
  delivery,
}: {
  delivery: SaveStoreSettingsInput["delivery"];
}) {
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
        Rates and estimates are store promises only. No courier provider is connected in this prototype.
      </p>
    </Card>
  );
}
