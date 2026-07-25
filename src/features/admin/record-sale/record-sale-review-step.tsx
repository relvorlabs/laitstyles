"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAdminRepositories } from "@/features/admin/data/admin-repository-context";
import {
  getSelectedSaleProduct,
  getSelectedSaleVariant,
} from "@/features/admin/record-sale/record-sale-selectors";
import type { RecordSaleValues } from "@/features/admin/record-sale/record-sale-types";
import { customersListQueryOptions } from "@/lib/admin/customers/customers-query-options";
import { formatNaira } from "@/lib/admin/shared/formatters";
import { adminProductsQueryOptions } from "@/modules/products/client/hooks";

export function RecordSaleReviewStep() {
  const repositories = useAdminRepositories();
  const { data: customers = [] } = useQuery(customersListQueryOptions(repositories));
  const { data: products = [] } = useQuery(adminProductsQueryOptions());
  const methods = useFormContext<RecordSaleValues>();
  const values = useWatch({ control: methods.control }) as RecordSaleValues;
  const product = getSelectedSaleProduct(products, values.productId);
  const variant = getSelectedSaleVariant(product, values.variantId);
  const customer =
    values.customerMode === "existing"
      ? customers.find((item) => item.id === values.customerId)
      : null;
  const customerName = customer?.name || values.customerName.trim() || "Walk-in customer";
  const customerEmail = customer?.email || values.customerEmail.trim() || "Email required";
  const total = (Number(values.quantity) || 0) * (Number(values.unitPrice) || 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              In-person order
            </p>
            <h3 className="mt-1 font-serif text-[28px] font-medium">
              {product?.name ?? "Product not selected"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {variant?.label ??
                (product?.inventoryMode === "unique" ? "One-of-one piece" : "Standard stock")}
            </p>
          </div>
          <Badge variant="secondary">Paystack pending</Badge>
        </div>

        <Separator className="my-5" />

        <dl className="grid gap-4 sm:grid-cols-2">
          <ReviewRow label="Quantity" value={String(values.quantity || 0)} />
          <ReviewRow label="Price per unit" value={formatNaira(values.unitPrice || 0)} />
          <ReviewRow label="Channel" value={values.channel.replaceAll("-", " ")} />
          <ReviewRow label="Customer" value={customerName} />
          <ReviewRow label="Checkout email" value={customerEmail} />
          <ReviewRow label="Payment" value="Paystack one-time checkout" />
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
          Checkout total
        </p>
        <p className="mt-2 font-serif text-[38px] font-medium leading-none tabular-nums">
          {formatNaira(total)}
        </p>
        <p className="mt-4 text-sm leading-6 text-primary-foreground/72">
          Generating checkout creates one pending order, reserves the exact stock and records a
          Paystack attempt. Revenue remains unchanged until the server verifies the payment.
        </p>
      </aside>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
