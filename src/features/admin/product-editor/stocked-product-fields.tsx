"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import {
  EditorNumberField,
  EditorTextField,
} from "@/features/admin/product-editor/product-editor-fields";
import type { ProductEditorValues } from "@/lib/admin/shared/types";
import { adminProductsQueryOptions } from "@/modules/products/client/hooks";

export function StockedProductFields() {
  const { data: products = [] } = useQuery(adminProductsQueryOptions());
  const { control } = useFormContext<ProductEditorValues>();
  const [productId, quantity] = useWatch({
    control,
    name: ["productId", "stocked.quantity"],
  });
  const existingProduct = products.find((product) => product.id === productId);
  const existing = existingProduct?.inventoryMode === "stocked" ? existingProduct : undefined;
  const committed = existing
    ? existing.stock.reserved +
      existing.stock.sold +
      existing.stock.returned +
      existing.stock.damaged
    : 0;
  const totalReceived = Number(quantity) || 0;
  const availableAfterSave = Math.max(totalReceived - committed, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-[16px] border border-border bg-surface-sunken p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="text-[12.5px] font-semibold">One catalogue SKU, one shared stock count.</p>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            Use this for 50 matching Adidas jeans or any product whose units are interchangeable. If
            size or colour needs a different quantity, use variants instead.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border rounded-xl border border-border bg-card px-2 py-3 text-center">
          <StockFigure label="Received" value={totalReceived} />
          <StockFigure label="Available after save" value={availableAfterSave} />
        </div>
      </div>

      {committed > totalReceived ? (
        <p className="rounded-xl border border-warning/40 bg-warning-surface p-4 text-sm text-warning-surface-foreground">
          {committed} units are already reserved, sold, returned or damaged. Total received cannot
          be reduced below committed stock without a separate stock adjustment.
        </p>
      ) : null}

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Size or fit label"
            name="stocked.sizeLabel"
            placeholder="Relaxed M/L or One size"
          />
          <EditorTextField label="Colour" name="stocked.colour" placeholder="Indigo" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <EditorNumberField
            description="All units ever received into this catalogue SKU. Existing commitments are preserved during edits."
            label="Total received"
            min={Math.max(1, committed)}
            name="stocked.quantity"
            placeholder="50"
          />
          <EditorNumberField
            description="The product appears in Low stock when available units reach this number."
            label="Low-stock threshold"
            min={0}
            name="lowStockThreshold"
            placeholder="5"
          />
        </div>
      </FieldGroup>
    </div>
  );
}

function StockFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[112px] px-3">
      <p className="font-serif text-2xl font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
