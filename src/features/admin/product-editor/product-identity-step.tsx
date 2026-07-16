"use client";

import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { CatalogueTaxonomyManager } from "@/features/admin/inventory/catalogue-taxonomy-manager";
import {
  EditorSelectField,
  EditorTextareaField,
  EditorTextField,
} from "@/features/admin/product-editor/product-editor-fields";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { generateProductSku } from "@/lib/admin/sku";
import type { ProductEditorValues } from "@/lib/admin/types";

export function ProductIdentityStep() {
  const { state } = useAdmin();
  const { control, setValue } = useFormContext<ProductEditorValues>();
  const [mode, name, brand, category, collection] = useWatch({
    control,
    name: ["inventoryMode", "name", "brand", "category", "collection"],
  });
  const currentCategory = category ?? "";
  const currentCollection = collection ?? "";
  const categories = useMemo(
    () =>
      createOptions(
        (state.catalogueTaxonomy ?? [])
          .filter((item) => item.kind === "category")
          .map((item) => item.name),
        currentCategory,
      ),
    [currentCategory, state.catalogueTaxonomy],
  );
  const collections = useMemo(
    () =>
      createOptions(
        (state.catalogueTaxonomy ?? [])
          .filter((item) => item.kind === "collection")
          .map((item) => item.name),
        currentCollection,
      ),
    [currentCollection, state.catalogueTaxonomy],
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
        category: currentCategory,
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
          Categories and collections are managed store-wide. The internal reference becomes the
          unique-piece reference, stocked-product SKU or variant SKU prefix.
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
            <Button onClick={generateReference} size="sm" type="button" variant="outline">
              <Sparkles aria-hidden="true" className="size-4" />
              Auto-generate reference
            </Button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <EditorSelectField label="Category" name="category" options={categories} />
            <CatalogueTaxonomyManager
              className="h-9 rounded-full"
              initialKind="category"
              onCreate={({ kind, name: createdName }) => {
                if (kind === "category") {
                  setValue("category", createdName, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              onDelete={({ name: deletedName }) => {
                if (currentCategory === deletedName) {
                  setValue("category", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              onRename={({ previousName, nextName }) => {
                if (currentCategory === previousName) {
                  setValue("category", nextName, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              triggerLabel="Manage categories"
            />
          </div>
          <EditorTextField label="Brand or label" name="brand" placeholder="Adidas or Unlabelled" />
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
            onCreate={({ kind, name: createdName }) => {
              if (kind === "collection") {
                setValue("collection", createdName, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            onDelete={({ name: deletedName }) => {
              if (currentCollection === deletedName) {
                setValue("collection", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            onRename={({ previousName, nextName }) => {
              if (currentCollection === previousName) {
                setValue("collection", nextName, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
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

        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Material / composition"
            name="material"
            placeholder="Wool body / leather sleeves"
          />
          <EditorTextField label="Recommended fit" name="fit" placeholder="M–L" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Style"
            name="style"
            placeholder="Vintage, Streetwear, Workwear…"
          />
          <EditorTextField
            label="Care instructions"
            name="careInstructions"
            placeholder="Hang dry, do not machine wash"
          />
        </div>

        <EditorTextareaField
          description="Disclosed honestly and shown to shoppers. Leave blank if there are no flaws."
          label="Disclosed flaws"
          name="flawNotes"
          placeholder="Small mark inside the left cuff"
          rows={3}
        />
      </FieldGroup>
    </section>
  );
}

function createOptions(values: string[], currentValue: string) {
  return Array.from(new Set([...values, currentValue.trim()].filter(Boolean)))
    .toSorted((left, right) => left.localeCompare(right, "en-NG"))
    .map((item) => [item, item] as const);
}
