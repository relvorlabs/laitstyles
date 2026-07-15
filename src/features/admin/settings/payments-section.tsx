"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { getSettingsFieldError } from "@/features/admin/settings/settings-errors";
import {
  SettingsNumberField,
  SettingsSelectField,
  SettingsTextareaField,
} from "@/features/admin/settings/settings-fields";
import { SettingsSectionFrame } from "@/features/admin/settings/settings-section-frame";
import type { AcceptedPaymentMethod, SaveStoreSettingsInput } from "@/lib/control-room/types";

const paymentMethods: ReadonlyArray<{
  value: AcceptedPaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: "bank-transfer",
    label: "Bank transfer",
    description: "The store checks receipt before confirming payment.",
  },
  {
    value: "card",
    label: "Card",
    description: "Shown as a store payment choice; card collection is handled separately.",
  },
  {
    value: "cash",
    label: "Cash",
    description: "Useful for physical-store and staff-assisted sales.",
  },
  {
    value: "pos",
    label: "POS",
    description: "Use for in-person terminal payments recorded by staff.",
  },
  {
    value: "pay-on-delivery",
    label: "Pay on delivery",
    description: "Customers may pay on arrival, subject to the deposit preference below.",
  },
];

const refundOptions = [
  ["original-method", "Return to the original payment method"],
  ["bank-transfer", "Send an approved bank transfer"],
  ["store-credit", "Issue store credit"],
] as const;

export function PaymentsSection() {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const payments = useWatch({
    control,
    name: "payments",
  }) as SaveStoreSettingsInput["payments"];
  const acceptedMethodsError = getSettingsFieldError(errors, "payments.acceptedMethods");

  function togglePaymentMethod(method: AcceptedPaymentMethod, enabled: boolean) {
    const current = getValues("payments.acceptedMethods");
    const next = enabled
      ? Array.from(new Set([...current, method]))
      : current.filter((item) => item !== method);
    setValue("payments.acceptedMethods", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (method === "pay-on-delivery") {
      setValue("selling.payOnDeliveryEnabled", enabled, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  const payOnDelivery = payments?.acceptedMethods?.includes("pay-on-delivery");

  return (
    <SettingsSectionFrame aside={<PaymentsPreview payments={payments} />} section="payments">
      <div>
        <h3 className="text-base font-semibold">Accepted payment methods</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Keep only the choices the store is prepared to honour and reconcile.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {paymentMethods.map((method) => (
            <Controller
              control={control}
              key={method.value}
              name="payments.acceptedMethods"
              render={({ field }) => {
                const checked = (field.value as AcceptedPaymentMethod[]).includes(method.value);
                return (
                  <Field className="rounded-xl border border-border p-4" orientation="horizontal">
                    <Checkbox
                      aria-label={`Accept ${method.label}`}
                      checked={checked}
                      onCheckedChange={(value) => togglePaymentMethod(method.value, Boolean(value))}
                    />
                    <div className="min-w-0 flex-1">
                      <FieldLabel>{method.label}</FieldLabel>
                      <FieldDescription className="mt-1 leading-5">
                        {method.description}
                      </FieldDescription>
                    </div>
                  </Field>
                );
              }}
            />
          ))}
        </div>
        <Field className="mt-2" data-invalid={Boolean(acceptedMethodsError)}>
          <FieldError>{acceptedMethodsError}</FieldError>
        </Field>
      </div>

      <div className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SettingsTextareaField
            description="Tell customers what reference to use and when a transfer is considered confirmed."
            label="Bank-transfer instructions"
            name="payments.bankTransferInstructions"
            rows={4}
          />
        </div>
        <SettingsSelectField
          description="The preferred route shown to staff when a refund is approved."
          label="Refund preference"
          name="payments.refundPreference"
          options={refundOptions}
        />
        <SettingsNumberField
          description={
            payOnDelivery
              ? "The portion collected before dispatch for pay-on-delivery orders."
              : "This value applies only when pay on delivery is offered."
          }
          label="Pay-on-delivery deposit"
          max={100}
          min={0}
          name="payments.payOnDeliveryDepositPercent"
          suffix="%"
        />
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
        These choices describe store policy only. The store still handles collection, payment
        checks, deposits and refunds outside this page.
      </div>
    </SettingsSectionFrame>
  );
}

function PaymentsPreview({ payments }: { payments: SaveStoreSettingsInput["payments"] }) {
  const active = paymentMethods.filter((method) =>
    payments?.acceptedMethods?.includes(method.value),
  );
  const refundLabel =
    refundOptions.find(([value]) => value === payments?.refundPreference)?.[1] ??
    "Original payment method";

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Payment summary
        </p>
        <Badge variant="outline">{active.length} accepted</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {active.map((method) => (
          <Badge key={method.value} variant="secondary">
            {method.label}
          </Badge>
        ))}
        {!active.length ? (
          <p className="text-xs text-destructive">Choose at least one payment method.</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Refund preference
        </p>
        <p className="mt-1 text-sm font-medium">{refundLabel}</p>
      </div>
      {payments?.acceptedMethods?.includes("pay-on-delivery") ? (
        <div className="rounded-xl border border-border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dispatch deposit
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums">
            {payments.payOnDeliveryDepositPercent}%
          </p>
        </div>
      ) : null}
    </Card>
  );
}
