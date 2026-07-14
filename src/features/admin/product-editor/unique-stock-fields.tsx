"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  EditorSelectField,
  EditorTextField,
} from "@/features/admin/product-editor/product-editor-fields";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { ProductEditorValues } from "@/lib/admin/types";

export function UniqueStockFields() {
  const { control } = useFormContext<ProductEditorValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "unique.measurements",
    keyName: "fieldKey",
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[16px] border border-chip-border bg-surface-selected-muted p-4 text-surface-selected-foreground">
        <p className="text-[12.5px] font-semibold">Quantity is fixed at one.</p>
        <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
          Holds, sales and returns will move this single physical piece between stock buckets; the
          editor cannot create duplicate units.
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-3">
          <EditorSelectField
            label="Condition"
            name="unique.condition"
            options={[
              ["Excellent", "Excellent"],
              ["Good", "Good"],
              ["Fair", "Fair"],
            ]}
          />
          <EditorTextField label="Size" name="unique.size" placeholder="M, UK 12 or One size" />
          <EditorTextField label="Colour" name="unique.colour" placeholder="Ivory" />
        </div>
      </FieldGroup>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <FieldLabel>Measurements</FieldLabel>
            <FieldDescription>
              Record the dimensions a shopper needs to judge fit accurately.
            </FieldDescription>
          </div>
          <Button
            className="h-10 rounded-full px-4"
            onClick={() =>
              append({
                id: `measurement-${crypto.randomUUID()}`,
                label: "",
                value: "",
              })
            }
            type="button"
            variant="outline"
          >
            <AdminIcon icon={Add01Icon} size={16} />
            Add measurement
          </Button>
        </div>

        {fields.length ? (
          <div className="mt-4 flex flex-col gap-3">
            {fields.map((field, index) => (
              <div
                className="grid gap-3 rounded-[14px] border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                key={field.fieldKey}
              >
                <EditorTextField
                  label="Measurement"
                  name={`unique.measurements.${index}.label`}
                  placeholder="Waist"
                />
                <EditorTextField
                  label="Value"
                  name={`unique.measurements.${index}.value`}
                  placeholder="76 cm"
                />
                <Button
                  aria-label={`Remove measurement ${index + 1}`}
                  className="size-10 rounded-full"
                  onClick={() => remove(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <AdminIcon icon={Delete02Icon} size={16} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-[14px] border border-dashed border-border bg-secondary/35 p-5 text-[12px] leading-5 text-muted-foreground">
            No measurements recorded yet. The draft can still be saved, but complete measurements
            are strongly recommended before publishing.
          </p>
        )}
      </div>
    </div>
  );
}
