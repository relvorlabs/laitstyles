"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getSelectedSaleProduct,
  getSelectedSaleVariant,
} from "@/features/control-room/record-sale/record-sale-selectors";
import type { RecordSaleValues } from "@/features/control-room/record-sale/record-sale-types";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import { formatNaira } from "@/lib/control-room/formatters";

export function RecordSaleReviewStep() {
  const { state } = useControlRoom();
  const methods = useFormContext<RecordSaleValues>();
  const values = useWatch({ control: methods.control }) as RecordSaleValues;
  const product = getSelectedSaleProduct(state, values.productId);
  const variant = getSelectedSaleVariant(product, values.variantId);
  const customer =
    values.customerMode === "existing"
      ? state.customers.find((item) => item.id === values.customerId)
      : null;
  const customerName =
    customer?.name || values.customerName.trim() || "Walk-in customer";
  const total = (Number(values.quantity) || 0) * (Number(values.unitPrice) || 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sale record
            </p>
            <h3 className="mt-1 font-serif text-[28px] font-medium">
              {product?.name ?? "Product not selected"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {variant?.label ??
                (product?.inventoryMode === "unique"
                  ? "One-of-one piece"
                  : "Standard stock")}
            </p>
          </div>
          <Badge variant="secondary">
            {values.paymentStatus.replaceAll("-", " ")}
          </Badge>
        </div>

        <Separator className="my-5" />

        <dl className="grid gap-4 sm:grid-cols-2">
          <ReviewRow label="Quantity" value={String(values.quantity || 0)} />
          <ReviewRow label="Price per unit" value={formatNaira(values.unitPrice || 0)} />
          <ReviewRow label="Channel" value={values.channel.replaceAll("-", " ")} />
          <ReviewRow label="Customer" value={customerName} />
          <ReviewRow
            label="Payment method"
            value={values.paymentMethod.replaceAll("-", " ")}
          />
          <ReviewRow
            label="Payment status"
            value={values.paymentStatus.replaceAll("-", " ")}
          />
        </dl>

        {values.notes.trim() ? (
          <div className="mt-5 rounded-[12px] bg-secondary/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Internal note
            </p>
            <p className="mt-2 text-sm leading-6">{values.notes.trim()}</p>
          </div>
        ) : null}
      </section>

      <aside className="self-start rounded-[16px] bg-primary p-5 text-primary-foreground sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">
          Confirmed total
        </p>
        <p className="mt-2 font-serif text-[38px] font-medium leading-none tabular-nums">
          {formatNaira(total)}
        </p>
        <p className="mt-4 text-sm leading-6 text-primary-foreground/72">
          Confirming creates one connected order, updates the selected stock bucket, records a movement and activity event, and updates paid revenue when applicable.
        </p>
      </aside>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
