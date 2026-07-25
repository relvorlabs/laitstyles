"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { getProductEditorFieldError } from "@/features/admin/product-editor/product-editor-errors";
import {
  type EditorFieldName,
  EditorNumberField,
  EditorTextField,
} from "@/features/admin/product-editor/product-editor-fields";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { generateVariantSku } from "@/lib/admin/inventory/sku";
import type { ProductEditorValues } from "@/lib/admin/shared/types";
import { adminProductsQueryOptions } from "@/modules/products/client/hooks";

export function VariantProductFields() {
  const { data: products = [] } = useQuery(adminProductsQueryOptions());
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const watchedVariants = useWatch({ control, name: "variant.variants" }) ?? [];
  const baseReference = useWatch({ control, name: "internalReference" });
  const referenceSeed = baseReference ?? "";
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variant.variants",
    keyName: "fieldKey",
  });
  const variantsError = getProductEditorFieldError(errors, "variant.variants");
  const totalReceived = watchedVariants.reduce(
    (total, variant) => total + (Number(variant.quantity) || 0),
    0,
  );
  const externalSkus = useMemo(
    () =>
      products.flatMap((product) => {
        if (product.inventoryMode === "unique") return [product.archiveNumber];
        if (product.inventoryMode === "stocked") return [product.sku];
        return product.variants.map((variant) => variant.sku);
      }),
    [products],
  );

  function generateSkuFor(index: number) {
    const variants = getValues("variant.variants");
    const variant = variants[index];
    if (!variant) return;
    const otherSkus = variants
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item) => item.sku)
      .filter(Boolean);
    setValue(
      `variant.variants.${index}.sku`,
      generateVariantSku(referenceSeed, variant.label, variant.size, variant.colour, [
        ...externalSkus,
        ...otherSkus,
      ]),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function generateAllSkus() {
    const variants = getValues("variant.variants");
    const generated: string[] = [];
    variants.forEach((variant, index) => {
      const sku = generateVariantSku(referenceSeed, variant.label, variant.size, variant.colour, [
        ...externalSkus,
        ...generated,
      ]);
      generated.push(sku);
      setValue(`variant.variants.${index}.sku`, sku, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-[16px] border border-border bg-surface-sunken p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-[12.5px] font-semibold">
            Each sellable option owns its SKU and stock.
          </p>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            Use variants when size, colour or another option needs a separate quantity. The
            catalogue product can show {totalReceived} units overall while every row remains
            independently sellable.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Total received
          </p>
          <p className="mt-1 font-serif text-2xl font-medium tabular-nums">{totalReceived}</p>
        </div>
      </div>

      <div>
        <FieldLabel>Option names</FieldLabel>
        <FieldDescription>
          Name the choices used to distinguish variants. Two options cover most fashion products.
        </FieldDescription>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <EditorTextField label="First option" name="variant.optionNames.0" placeholder="Size" />
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
              Add one row per sellable option combination. Every row requires a unique SKU before
              publishing.
            </FieldDescription>
            <FieldError>{variantsError}</FieldError>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!referenceSeed.trim()}
              onClick={generateAllSkus}
              type="button"
              variant="outline"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              Generate all SKUs
            </Button>
            <Button
              size="lg"
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
              <AdminIcon icon={Add01Icon} size={16} />
              Add variant
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {fields.map((field, index) => {
            const name = (suffix: string) =>
              `variant.variants.${index}.${suffix}` as EditorFieldName;
            const current = watchedVariants[index] ?? field;

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
                      {current.label || "Unnamed option combination"}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove variant ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <AdminIcon icon={Delete02Icon} size={16} />
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <EditorTextField
                    label="Variant label"
                    name={name("label")}
                    placeholder="Cream / M"
                  />
                  <div className="space-y-2">
                    <EditorTextField
                      label="Variant SKU"
                      name={name("sku")}
                      placeholder="LS-VAR-ADI-JEA-CRM-M"
                    />
                    <Button
                      disabled={!referenceSeed.trim()}
                      onClick={() => generateSkuFor(index)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Sparkles aria-hidden="true" className="size-4" />
                      Generate SKU
                    </Button>
                  </div>
                  <EditorNumberField
                    description="Units received for this exact option combination."
                    label="Total received"
                    min={0}
                    name={name("quantity")}
                    placeholder="10"
                  />
                  <EditorTextField label="Size" name={name("size")} placeholder="M" />
                  <EditorTextField label="Colour" name={name("colour")} placeholder="Cream" />
                  <EditorTextField
                    description="Optional. Use a product image URL specific to this option."
                    label="Variant image URL"
                    name={name("imageUrl")}
                    placeholder="https://…"
                  />
                  <EditorNumberField
                    description="Leave blank to use the product selling price."
                    label="Variant selling price"
                    min={0}
                    name={name("price")}
                    placeholder="Optional"
                  />
                  <EditorNumberField
                    description="Leave blank to use the product unit cost."
                    label="Variant unit cost"
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
        description="The product enters Low stock when any available variant reaches this number."
        label="Per-variant low-stock threshold"
        min={0}
        name="lowStockThreshold"
        placeholder="3"
      />
    </div>
  );
}
