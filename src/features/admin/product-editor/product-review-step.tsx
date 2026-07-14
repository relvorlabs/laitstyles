"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { useFormContext, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditorTextField } from "@/features/control-room/product-editor/product-editor-fields";
import { getProductEditorStepLabel } from "@/features/control-room/product-editor/product-editor-step-labels";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatNaira } from "@/lib/control-room/formatters";
import type {
  ProductEditorIssue,
  ProductEditorStep,
  ProductEditorValues,
} from "@/lib/control-room/types";

export function ProductReviewStep({
  issues,
  onStepChange,
}: {
  issues: ProductEditorIssue[];
  onStepChange: (step: ProductEditorStep) => void;
}) {
  const { control } = useFormContext<ProductEditorValues>();
  const values = useWatch({ control }) as ProductEditorValues;
  const received = getReceivedQuantity(values);
  const reference =
    values.inventoryMode === "variant"
      ? `${values.variant.variants.length} variant SKU${values.variant.variants.length === 1 ? "" : "s"}`
      : values.internalReference || "Pending reference";

  return (
    <section aria-labelledby="product-review-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Final review
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-review-title"
        >
          Review the product before choosing its next state.
        </h2>
        <p className="mt-3 max-w-[700px] text-[13px] leading-6 text-muted-foreground">
          Save draft accepts incomplete work. Publish now and Schedule require every blocking field
          to be valid.
        </p>
      </div>

      {issues.length ? (
        <Alert variant="destructive">
          <ControlRoomIcon icon={AlertCircleIcon} size={18} />
          <AlertTitle>
            {issues.length} blocking requirement{issues.length === 1 ? "" : "s"}
          </AlertTitle>
          <AlertDescription>Resolve these items before publishing or scheduling.</AlertDescription>
          <div className="col-start-2 mt-3 flex flex-col gap-2">
            {issues.slice(0, 8).map((issue) => (
              <Button
                className="h-auto w-full justify-start rounded-[10px] border border-destructive/25 bg-background/60 px-3 py-2 text-left text-[11.5px] leading-5"
                key={`${issue.step}:${issue.path}:${issue.message}`}
                onClick={() => onStepChange(issue.step)}
                type="button"
                variant="ghost"
              >
                <span>
                  <span className="font-semibold">{getProductEditorStepLabel(issue.step)}:</span>{" "}
                  {issue.message}
                </span>
              </Button>
            ))}
          </div>
        </Alert>
      ) : (
        <Alert className="border-success/35 bg-success/10 text-foreground">
          <AlertTitle>Ready for a publication action</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            No blocking validation issue remains in the current form values.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReviewCard
          label="Product"
          value={values.name || "Untitled product"}
          supporting={`${values.category || "Uncategorised"} · ${values.brand || "Unlabelled"}`}
        />
        <ReviewCard
          label="Inventory model"
          value={modeLabel(values.inventoryMode)}
          supporting={`${received} received · threshold ${values.lowStockThreshold}`}
        />
        <ReviewCard
          label="Reference"
          value={reference}
          supporting={`${values.media.length} image preview${values.media.length === 1 ? "" : "s"}`}
        />
        <ReviewCard
          label="Pricing"
          value={
            typeof values.sellingPrice === "number"
              ? formatNaira(values.sellingPrice)
              : "Not priced"
          }
          supporting={
            typeof values.cost === "number"
              ? `${formatNaira(values.cost)} unit cost`
              : "Unit cost not recorded"
          }
        />
        <ReviewCard
          label="Selling channels"
          value={`${values.channels.length} selected`}
          supporting={values.channels.length ? values.channels.join(" · ") : "No channel selected"}
        />
        <ReviewCard
          label="Fulfilment"
          value={values.fulfilment.pickupAvailable ? "Pickup available" : "Delivery only"}
          supporting={
            values.fulfilment.weightKg
              ? `${values.fulfilment.weightKg} kg estimated packed weight`
              : "Weight not recorded"
          }
        />
      </div>

      <div className="rounded-[18px] border border-border bg-secondary/35 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold">Schedule publication</h3>
            <p className="mt-1 max-w-[560px] text-[11.5px] leading-5 text-muted-foreground">
              This records a scheduled state in the current browser session. It does not create a
              real background publishing job.
            </p>
          </div>
          <Badge variant="outline">Prototype only</Badge>
        </div>
        <div className="mt-4 max-w-[420px]">
          <EditorTextField
            label="Publication date and time"
            name="scheduledAt"
            type="datetime-local"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[14px] border border-border bg-card p-4">
        <span className="mt-0.5 text-[18px]" aria-hidden="true">
          ⓘ
        </span>
        <p className="text-[11.5px] leading-5 text-muted-foreground">
          Drafts, published products and Intake changes in this prototype are session-only.
          Refreshing the page restores the deterministic seed catalogue.
        </p>
      </div>
    </section>
  );
}

function ReviewCard({
  label,
  value,
  supporting,
}: {
  label: string;
  value: string;
  supporting: string;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 break-words font-serif text-[23px] font-medium leading-tight">{value}</p>
        <p className="mt-2 break-words text-[11px] leading-5 text-muted-foreground">{supporting}</p>
      </CardContent>
    </Card>
  );
}

function getReceivedQuantity(values: ProductEditorValues) {
  if (values.inventoryMode === "unique") return 1;
  if (values.inventoryMode === "stocked") return values.stocked.quantity;
  return values.variant.variants.reduce((total, variant) => total + variant.quantity, 0);
}

function modeLabel(mode: ProductEditorValues["inventoryMode"]) {
  if (mode === "unique") return "Unique piece";
  if (mode === "stocked") return "Stocked product";
  return "Product with variants";
}
