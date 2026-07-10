"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  SettingsNumberField,
  SettingsSelectField,
  SettingsTextField,
} from "@/features/control-room/settings/settings-fields";
import { SettingsSectionFrame } from "@/features/control-room/settings/settings-section-frame";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

const productModeOptions = [
  ["unique", "Unique piece"],
  ["stocked", "Multiple identical units"],
  ["variant", "Sizes, colours or other variants"],
] as const;

export function SellingPreferencesSection() {
  const { control, getValues, setValue } =
    useFormContext<SaveStoreSettingsInput>();
  const selling = useWatch({ control, name: "selling" }) as SaveStoreSettingsInput["selling"];

  function changePayOnDelivery(enabled: boolean) {
    setValue("selling.payOnDeliveryEnabled", enabled, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const methods = getValues("payments.acceptedMethods");
    const nextMethods = enabled
      ? Array.from(new Set([...methods, "pay-on-delivery" as const]))
      : methods.filter((method) => method !== "pay-on-delivery");
    setValue("payments.acceptedMethods", nextMethods, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <SettingsSectionFrame
      aside={<SellingPreview selling={selling} />}
      section="selling"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <SettingsTextField
          description="Prices and reporting remain in Nigerian naira for this product scope."
          disabled
          label="Store currency"
          name="selling.currency"
        />
        <SettingsSelectField
          description="The starting stock setup when a new product is created."
          label="Default product type"
          name="selling.defaultProductMode"
          options={productModeOptions}
        />
        <SettingsNumberField
          description="How long an unpaid customer reservation remains active by default."
          label="Default hold duration"
          max={1440}
          min={5}
          name="selling.holdDurationMinutes"
          suffix="minutes"
        />
        <SettingsNumberField
          description="Stocked products at or below this quantity enter the low-stock view."
          label="Low-stock warning"
          max={10000}
          min={0}
          name="selling.lowStockThreshold"
          suffix="units"
        />
      </div>

      <Controller
        control={control}
        name="selling.payOnDeliveryEnabled"
        render={({ field }) => (
          <Field
            className="rounded-xl border border-border p-4 sm:p-5"
            orientation="horizontal"
          >
            <Checkbox
              aria-label="Offer pay on delivery"
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => changePayOnDelivery(Boolean(checked))}
            />
            <div className="min-w-0 flex-1">
              <FieldLabel>Offer pay on delivery</FieldLabel>
              <FieldDescription className="mt-1 leading-5">
                When enabled, Pay on delivery is also added to accepted payment methods so both settings remain consistent.
              </FieldDescription>
            </div>
          </Field>
        )}
      />
    </SettingsSectionFrame>
  );
}

function SellingPreview({
  selling,
}: {
  selling: SaveStoreSettingsInput["selling"];
}) {
  const modeLabel =
    productModeOptions.find(([value]) => value === selling?.defaultProductMode)?.[1] ??
    "Unique piece";

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Working defaults
        </p>
        <Badge variant="outline">NGN</Badge>
      </div>
      <div className="grid gap-3">
        <PreviewRow label="New product starts as" value={modeLabel} />
        <PreviewRow
          label="Customer hold"
          value={`${selling?.holdDurationMinutes ?? 0} minutes`}
        />
        <PreviewRow
          label="Low-stock attention"
          value={`${selling?.lowStockThreshold ?? 0} units or fewer`}
        />
        <PreviewRow
          label="Pay on delivery"
          value={selling?.payOnDeliveryEnabled ? "Available" : "Not offered"}
        />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        These are starting preferences. Product and order workflows can still capture more specific information where needed.
      </p>
    </Card>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
