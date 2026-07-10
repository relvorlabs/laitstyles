"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { CatalogueTaxonomyManager } from "@/features/control-room/inventory/catalogue-taxonomy-manager";
import {
  EditorSelectField,
  EditorTextField,
  EditorTextareaField,
} from "@/features/control-room/product-editor/product-editor-fields";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import { generateProductSku } from "@/lib/control-room/sku";
import type { ProductEditorValues } from "@/lib/control-room/types";

export function ProductIdentityStep() {
  const { state } = useControlRoom();
  const { control, setValue } = useFormContext<ProductEditorValues>();
  const [mode, name, brand, category] = useWatch({
    control,
    name: ["inventoryMode", "name", "brand", "category"],
  });
  const categories = useMemo(
    () =>
      (state.catalogueTaxonomy ?? [])
        .filter((item) => item.kind === "category")
        .map((item) => [item.name, item.name] as const),
    [state.catalogueTaxonomy],
  );
  const collections = useMemo(
    () =>
      (state.catalogueTaxonomy ?? [])
        .filter((item) => item.kind === "collection")
        .map((item) => [item.name, item.name] as const),
    [state.catalogueTaxonomy],
  );

  function generateReference() {
    const existingReferences = state.products.flatMap((product) => {
      if (product.inventoryMode === "unique") return [product.archiveNumber];
      if (product.inventoryMode === "stocked") return [product.sku];
      return product.variants.map((variant) => variant.sku);
    });
    setValue(
      "internalReference",
      generateProductSku({
        mode: mode ?? "unique",
        name: name ?? "",
        brand: brand ?? "",
        category: category ?? "",
        existingReferences,
      }),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  return (
    <section aria-labelledby="product-identity-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Product identity
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-identity-title"
        >
          Give the catalogue record a clear identity.
        </h2>
        <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-muted-foreground">
          Categories and collections are managed store-wide. The internal reference becomes the unique-piece reference, stocked-product SKU or variant SKU prefix.
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Product name"
            name="name"
            placeholder="Adidas relaxed denim jeans"
          />
          <div className="space-y-2">
            <EditorTextField
              description="Unique piece: one item reference. Stocked product: one SKU shared by matching units. Variant product: prefix used to generate each variant SKU."
              label="Internal reference / SKU seed"
              name="internalReference"
              placeholder="LS-STK-ADI-JEA-ARDJ"
            />
            <Button
              className="h-9 rounded-full"
              onClick={generateReference}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              Auto-generate reference
            </Button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <EditorSelectField
              label="Category"
              name="category"
              options={categories}
            />
            <CatalogueTaxonomyManager
              className="h-9 rounded-full"
              initialKind="category"
              triggerLabel="Manage categories"
            />
          </div>
          <EditorTextField
            label="Brand or label"
            name="brand"
            placeholder="Adidas or Unlabelled"
          />
        </div>

        <div className="space-y-2">
          <EditorSelectField
            description="Optional. Use collections for campaigns, seasons or curated edits—not as a replacement for category."
            emptyLabel="No collection"
            label="Collection"
            name="collection"
            options={collections}
          />
          <CatalogueTaxonomyManager
            className="h-9 rounded-full"
            initialKind="collection"
            triggerLabel="Manage collections"
          />
        </div>

        <EditorTextareaField
          description="Describe construction, material, finish and the details a shopper should understand."
          label="Product description"
          name="description"
          placeholder="Relaxed Adidas denim jeans with…"
          rows={5}
        />
      </FieldGroup>
    </section>
  );
}
