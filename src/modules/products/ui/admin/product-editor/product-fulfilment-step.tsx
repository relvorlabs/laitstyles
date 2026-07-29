"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import type { CatalogueChannel, ProductEditorValues } from "@/lib/admin/shared/types";
import {
  EditorCheckboxField,
  EditorNumberField,
  EditorTextareaField,
} from "@/modules/products/ui/admin/product-editor/product-editor-fields";

const channels = [
  ["storefront", "Storefront", "Visible in the customer-facing catalogue."],
  ["physical-store", "Physical store", "Available for in-person assisted sales."],
  ["whatsapp", "WhatsApp", "Can be shared and sold through WhatsApp conversations."],
  ["instagram", "Instagram", "Can be surfaced through Instagram-assisted selling."],
] as const satisfies ReadonlyArray<readonly [CatalogueChannel, string, string]>;

export function ProductFulfilmentStep() {
  const { control } = useFormContext<ProductEditorValues>();

  return (
    <section aria-labelledby="product-fulfilment-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Selling and delivery
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-fulfilment-title"
        >
          Decide where it can sell and how it should travel.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          These settings guide the prototype workflow only. No courier or marketplace integration is
          being configured here.
        </p>
      </div>

      <FieldSet>
        <FieldLegend>Selling channels</FieldLegend>
        <FieldDescription>
          Choose every channel where this product should be available after publication.
        </FieldDescription>
        <Controller
          control={control}
          name="channels"
          render={({ field }) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {channels.map(([value, label, description]) => {
                const selected = field.value.includes(value);
                const descriptionId = `selling-channel-${value}-description`;

                return (
                  <Field
                    className="rounded-[14px] border border-border bg-card p-4"
                    key={value}
                    orientation="horizontal"
                  >
                    <Checkbox
                      aria-describedby={descriptionId}
                      aria-label={label}
                      checked={selected}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...field.value, value]
                          : field.value.filter((item) => item !== value);
                        field.onChange(next);
                      }}
                    />
                    <div className="flex flex-col gap-1">
                      <FieldTitle>{label}</FieldTitle>
                      <FieldDescription id={descriptionId}>{description}</FieldDescription>
                    </div>
                  </Field>
                );
              })}
            </div>
          )}
        />
      </FieldSet>

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-2">
          <EditorNumberField
            description="Optional planning weight; this does not call a courier service."
            label="Estimated packed weight (kg)"
            min={0.01}
            name="fulfilment.weightKg"
            placeholder="0.6"
            step={0.01}
          />
          <EditorCheckboxField
            description="Allows the product to be marked for customer pickup in later sales workflows."
            label="Pickup is available"
            name="fulfilment.pickupAvailable"
          />
        </div>

        <EditorTextareaField
          description="Record location or handling restrictions in plain business language."
          label="Delivery restrictions"
          name="fulfilment.deliveryRestrictions"
          placeholder="Do not ship outside Nigeria, keep flat, or leave blank."
          rows={3}
        />

        <EditorTextareaField
          description="Internal instructions for preparing this product after a sale."
          label="Packaging notes"
          name="fulfilment.packagingNotes"
          placeholder="Fold with tissue and use a medium mailer."
          rows={3}
        />
      </FieldGroup>
    </section>
  );
}
