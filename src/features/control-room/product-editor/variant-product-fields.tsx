"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import {
  EditorNumberField,
  EditorTextField,
  getFieldError,
  type EditorFieldName,
} from "@/features/control-room/product-editor/product-editor-fields";
import type { ProductEditorValues } from "@/lib/control-room/types";

export function VariantProductFields() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variant.variants",
    keyName: "fieldKey",
  });
  const variantsError = getFieldError(errors, "variant.variants");

  return (
    <div className="space-y-6">
      <div className="rounded-[16px] border border-border bg-secondary/45 p-4">
        <p className="text-[12.5px] font-semibold">
          Each row owns its stock.
        </p>
        <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
          A product can show nine units overall while one size is nearly gone. Variant-level quantities keep that risk visible.
        </p>
      </div>

      <div>
        <FieldLabel>Option names</FieldLabel>
        <FieldDescription>
          Name the choices used to distinguish variants. Two options are enough for this prototype.
        </FieldDescription>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <EditorTextField
            label="First option"
            name="variant.optionNames.0"
            placeholder="Size"
          />
          <EditorTextField
            label="Second option"
            name="variant.optionNames.1"
            placeholder="Colour"
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <FieldLabel>Variant rows</FieldLabel>
            <FieldDescription>
              Add one row per sellable option combination.
            </FieldDescription>
            <FieldError>{variantsError}</FieldError>
          </div>
          <Button
            className="h-10 rounded-full px-4"
            onClick={() =>
              append({
                id: `variant-${crypto.randomUUID()}`,
                label: "",
                sku: "",
                size: "",
                colour: "",
                imageUrl: "",
                price: null,
                cost: null,
                quantity: 1,
              })
            }
            type="button"
            variant="outline"
          >
            <ControlRoomIcon icon={Add01Icon} size={16} />
            Add variant
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {fields.map((field, index) => {
            const name = (suffix: string) =>
              `variant.variants.${index}.${suffix}` as EditorFieldName;

            return (
              <article
                className="rounded-[18px] border border-border bg-card p-4"
                key={field.fieldKey}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Variant {index + 1}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold">
                      {field.label || "Unnamed option combination"}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove variant ${index + 1}`}
                    className="size-9 rounded-full"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ControlRoomIcon icon={Delete02Icon} size={16} />
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <EditorTextField
                    label="Variant label"
                    name={name("label")}
                    placeholder="Cream / M"
                  />
                  <EditorTextField
                    label="Variant SKU"
                    name={name("sku")}
                    placeholder="LS-RST-CRM-M"
                  />
                  <EditorNumberField
                    label="Total received"
                    min={0}
                    name={name("quantity")}
                    placeholder="10"
                  />
                  <EditorTextField
                    label="Size"
                    name={name("size")}
                    placeholder="M"
                  />
                  <EditorTextField
                    label="Colour"
                    name={name("colour")}
                    placeholder="Cream"
                  />
                  <EditorTextField
                    label="Variant image URL"
                    name={name("imageUrl")}
                    placeholder="Optional"
                  />
                  <EditorNumberField
                    description="Leave blank to use the product selling price."
                    label="Variant price"
                    min={0}
                    name={name("price")}
                    placeholder="Optional"
                  />
                  <EditorNumberField
                    description="Leave blank to use the product acquisition cost."
                    label="Variant cost"
                    min={0}
                    name={name("cost")}
                    placeholder="Optional"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <EditorNumberField
        description="A variant product enters Low stock when any available variant reaches this number."
        label="Per-variant low-stock threshold"
        min={0}
        name="lowStockThreshold"
        placeholder="3"
      />
    </div>
  );
}
