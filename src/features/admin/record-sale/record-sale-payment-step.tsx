"use client";

import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { RecordSaleValues } from "@/features/admin/record-sale/record-sale-types";

export function RecordSalePaymentStep() {
  const methods = useFormContext<RecordSaleValues>();

  return (
    <FieldGroup>
      <section className="rounded-[16px] border border-border bg-secondary/35 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tracked payment
            </p>
            <h3 className="mt-1 font-serif text-[26px] font-medium">Paystack one-time checkout</h3>
          </div>
          <Badge variant="secondary">Payment pending</Badge>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          The final action creates a pending in-person order, reserves the selected stock and opens
          Paystack Checkout. The customer chooses card, bank, USSD, bank transfer or another method
          enabled for the store.
        </p>
      </section>

      <Field data-invalid={Boolean(methods.formState.errors.notes)}>
        <FieldLabel htmlFor="record-sale-notes">Internal notes</FieldLabel>
        <Textarea
          aria-invalid={Boolean(methods.formState.errors.notes)}
          id="record-sale-notes"
          placeholder="Pickup arrangement, staff context, or another useful operational note…"
          {...methods.register("notes")}
        />
        <FieldDescription>
          Notes are stored with the pending order. Never place card, bank or transfer credentials
          here.
        </FieldDescription>
        <FieldError errors={[methods.formState.errors.notes]} />
      </Field>

      <Alert>
        <AlertTitle>Payment is not confirmed by the popup</AlertTitle>
        <AlertDescription>
          Generating or completing Checkout does not mark this order paid. A later server
          verification or signed Paystack webhook must confirm the reference and amount before
          stock is committed and the order can be fulfilled.
        </AlertDescription>
      </Alert>
    </FieldGroup>
  );
}
