"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { EditorNumberField } from "@/features/control-room/product-editor/product-editor-fields";
import { formatNaira } from "@/lib/control-room/formatters";
import type { ProductEditorValues } from "@/lib/control-room/types";

export function ProductPricingStep() {
  const { control } = useFormContext<ProductEditorValues>();
  const [sellingPrice, cost, referencePrice] = useWatch({
    control,
    name: ["sellingPrice", "cost", "referencePrice"],
  });
  const price = typeof sellingPrice === "number" ? sellingPrice : 0;
  const acquisitionCost = typeof cost === "number" ? cost : 0;
  const margin = price > 0 ? price - acquisitionCost : 0;
  const marginRate = price > 0 ? Math.round((margin / price) * 100) : 0;

  return (
    <section aria-labelledby="product-pricing-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Commercial truth
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-pricing-title"
        >
          Set a price with its margin visible.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          Selling price is customer-facing. Cost and reference price stay inside the Control Room.
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-3">
          <EditorNumberField
            label="Selling price"
            min={1}
            name="sellingPrice"
            placeholder="24500"
          />
          <EditorNumberField
            label="Acquisition cost"
            min={0}
            name="cost"
            placeholder="9800"
          />
          <EditorNumberField
            description="Optional comparison or market reference."
            label="Reference price"
            min={1}
            name="referencePrice"
            placeholder="30000"
          />
        </div>
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-3">
        <PricingPreview
          label="Selling price"
          value={price > 0 ? formatNaira(price) : "Not set"}
        />
        <PricingPreview
          label="Gross margin"
          tone={margin < 0 ? "warning" : "default"}
          value={price > 0 ? formatNaira(margin) : "Waiting for price"}
        />
        <PricingPreview
          label="Margin rate"
          tone={marginRate < 20 ? "warning" : "default"}
          value={price > 0 ? `${marginRate}%` : "—"}
        />
      </div>

      {typeof referencePrice === "number" && referencePrice < price ? (
        <p className="rounded-[14px] border border-[#D9B8A7] bg-[#F5E7DF] p-4 text-[12px] leading-5 text-[#784B38]">
          The reference price is below the selling price. Confirm that this is intentional before publishing.
        </p>
      ) : null}
    </section>
  );
}

function PricingPreview({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className={tone === "warning" ? "border-[#D9B8A7]" : undefined}>
      <CardContent className="py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 font-serif text-[26px] font-medium leading-none tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
