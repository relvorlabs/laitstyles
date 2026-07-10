"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EditorNumberField } from "@/features/control-room/product-editor/product-editor-fields";
import { formatNaira } from "@/lib/control-room/formatters";
import type { ProductEditorValues } from "@/lib/control-room/types";

export function ProductPricingStep() {
  const [desiredDiscount, setDesiredDiscount] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const { control, setValue } = useFormContext<ProductEditorValues>();
  const [sellingPrice, cost, referencePrice] = useWatch({
    control,
    name: ["sellingPrice", "cost", "referencePrice"],
  });
  const price = typeof sellingPrice === "number" ? sellingPrice : 0;
  const unitCost = typeof cost === "number" ? cost : null;
  const compareAt = typeof referencePrice === "number" ? referencePrice : null;
  const margin = unitCost !== null && price > 0 ? price - unitCost : null;
  const marginRate = margin !== null && price > 0 ? Math.round((margin / price) * 100) : null;
  const actualDiscount =
    compareAt !== null && compareAt > price && price > 0
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : 0;

  function applyDiscount() {
    const percentage = Number(desiredDiscount);
    if (!compareAt || compareAt <= 0) {
      setFeedback("Enter a compare-at price before applying a discount.");
      return;
    }
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage >= 100) {
      setFeedback("Discount must be greater than 0% and below 100%.");
      return;
    }

    const nextPrice = Math.max(1, Math.round(compareAt * (1 - percentage / 100)));
    setValue("sellingPrice", nextPrice, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setFeedback(`${percentage}% discount applied. Selling price is ${formatNaira(nextPrice)}.`);
  }

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
          Set the customer price without hiding the maths.
        </h2>
        <p className="mt-3 max-w-[720px] text-[13px] leading-6 text-muted-foreground">
          Selling price is what the customer pays. Unit cost is what one unit cost your store to obtain and is optional—it exists only to show gross margin. Compare-at price is the higher original or list price used to communicate a genuine discount.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <EditorNumberField
          label="Selling price"
          min={1}
          name="sellingPrice"
          placeholder="24500"
        />
        <EditorNumberField
          description="Optional. What your store paid for one unit, including acquisition where useful. Customers never see it."
          label="Unit cost"
          min={0}
          name="cost"
          placeholder="9800"
        />
        <EditorNumberField
          description="Optional. Must be higher than the selling price when a discount is shown."
          label="Compare-at price"
          min={1}
          name="referencePrice"
          placeholder="30000"
        />
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-surface-sunken p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="desired-discount">Apply discount percentage</FieldLabel>
          <FieldDescription>
            Enter a percentage to calculate the selling price from the compare-at price. Manual price edits remain allowed.
          </FieldDescription>
          <Input
            className="h-11 tabular-nums"
            id="desired-discount"
            inputMode="decimal"
            max={99}
            min={0}
            onChange={(event) => setDesiredDiscount(event.target.value)}
            placeholder="20"
            type="number"
            value={desiredDiscount}
          />
        </Field>
        <Button
          className="h-11 rounded-full px-5"
          disabled={!desiredDiscount}
          onClick={applyDiscount}
          type="button"
          variant="outline"
        >
          <Calculator aria-hidden="true" className="size-4" />
          Calculate price
        </Button>
      </div>

      {feedback ? (
        <p aria-live="polite" className="rounded-xl border border-border bg-surface-interactive px-4 py-3 text-sm text-surface-interactive-foreground">
          {feedback}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PricingPreview
          label="Selling price"
          value={price > 0 ? formatNaira(price) : "Not set"}
        />
        <PricingPreview
          label="Discount"
          value={actualDiscount > 0 ? `${actualDiscount}%` : "No discount"}
        />
        <PricingPreview
          label="Gross margin"
          tone={margin !== null && margin < 0 ? "warning" : "default"}
          value={margin === null ? "Add unit cost" : formatNaira(margin)}
        />
        <PricingPreview
          label="Margin rate"
          tone={marginRate !== null && marginRate < 20 ? "warning" : "default"}
          value={marginRate === null ? "—" : `${marginRate}%`}
        />
      </div>

      {compareAt !== null && compareAt <= price ? (
        <p className="rounded-[14px] border border-warning/40 bg-warning-surface p-4 text-[12px] leading-5 text-warning-surface-foreground">
          Compare-at price must be higher than the selling price. Remove it when the product is not discounted.
        </p>
      ) : null}
      {unitCost !== null && price > 0 && unitCost > price ? (
        <p className="rounded-[14px] border border-warning/40 bg-warning-surface p-4 text-[12px] leading-5 text-warning-surface-foreground">
          Unit cost is above the selling price, so this product would sell at a gross loss.
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
    <Card className={tone === "warning" ? "border-warning/40" : undefined}>
      <CardContent className="py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 font-serif text-[24px] font-medium leading-none tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
