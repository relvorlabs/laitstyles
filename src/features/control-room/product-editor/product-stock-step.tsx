"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { StockedProductFields } from "@/features/control-room/product-editor/stocked-product-fields";
import { UniqueStockFields } from "@/features/control-room/product-editor/unique-stock-fields";
import { VariantProductFields } from "@/features/control-room/product-editor/variant-product-fields";
import type { ProductEditorValues } from "@/lib/control-room/types";

export function ProductStockStep() {
  const { control } = useFormContext<ProductEditorValues>();
  const mode = useWatch({ control, name: "inventoryMode" });

  return (
    <section aria-labelledby="product-stock-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Stock truth
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-stock-title"
        >
          Record what can actually be sold.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          The fields below are specific to the product type chosen in step one. Stock commitments from an existing product are preserved during edits.
        </p>
      </div>

      {mode === "unique" ? <UniqueStockFields /> : null}
      {mode === "stocked" ? <StockedProductFields /> : null}
      {mode === "variant" ? <VariantProductFields /> : null}
    </section>
  );
}
