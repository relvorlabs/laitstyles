"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RecordSaleValues } from "@/features/admin/record-sale/record-sale-types";
import type { PaymentMethod } from "@/lib/admin/types";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  "bank-transfer": "Bank transfer",
  card: "Card",
  pos: "POS",
  "pay-on-delivery": "Pay on delivery",
  other: "Other",
};

const paymentMethods = Object.keys(paymentMethodLabels) as PaymentMethod[];

const paymentStatusLabels: Record<RecordSaleValues["paymentStatus"], string> = {
  paid: "Paid in full",
  deposit: "Deposit received",
  pending: "Payment pending",
};

export function RecordSalePaymentStep() {
  const methods = useFormContext<RecordSaleValues>();
  const paymentMethod = useWatch({
    control: methods.control,
    name: "paymentMethod",
  });
  const paymentStatus = useWatch({
    control: methods.control,
    name: "paymentStatus",
  });

  return (
    <FieldGroup>
      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={methods.control}
          name="paymentStatus"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="record-sale-payment-status">Payment status</FieldLabel>
              <Select onValueChange={(value) => value && field.onChange(value)} value={field.value}>
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="h-12 w-full"
                  id="record-sale-payment-status"
                >
                  <span className="flex-1 truncate text-left">
                    {paymentStatusLabels[paymentStatus]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payment status</SelectLabel>
                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Paid and deposit sales count toward revenue; pending sales reserve stock.
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={methods.control}
          name="paymentMethod"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="record-sale-payment-method">Payment method</FieldLabel>
              <Select onValueChange={(value) => value && field.onChange(value)} value={field.value}>
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="h-12 w-full"
                  id="record-sale-payment-method"
                >
                  <span className="flex-1 truncate text-left">
                    {paymentMethodLabels[paymentMethod]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payment method</SelectLabel>
                    {paymentMethods.map((value) => (
                      <SelectItem key={value} value={value}>
                        {paymentMethodLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <Field data-invalid={Boolean(methods.formState.errors.notes)}>
        <FieldLabel htmlFor="record-sale-notes">Internal notes</FieldLabel>
        <Textarea
          aria-invalid={Boolean(methods.formState.errors.notes)}
          id="record-sale-notes"
          placeholder="Transfer reference, pickup arrangement, staff context, or other useful detail…"
          {...methods.register("notes")}
        />
        <FieldDescription>Notes are stored only in this prototype session.</FieldDescription>
        <FieldError errors={[methods.formState.errors.notes]} />
      </Field>

      <Alert>
        <AlertTitle>No payment provider is contacted</AlertTitle>
        <AlertDescription>
          This records the staff member’s stated payment status. It does not charge a card, confirm a
          transfer, or settle funds.
        </AlertDescription>
      </Alert>
    </FieldGroup>
  );
}
