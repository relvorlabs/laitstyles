"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import type { RecordSaleValues } from "@/features/admin/record-sale/record-sale-types";
import { useAdmin } from "@/features/admin/state/admin-provider";
import type { SalesChannel } from "@/lib/admin/types";

const channelLabels: Record<Exclude<SalesChannel, "online">, string> = {
  "physical-store": "Physical store",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  phone: "Phone",
  "pop-up": "Pop-up event",
  "staff-assisted": "Staff-assisted",
  other: "Other",
};

const channels = Object.keys(channelLabels) as Array<Exclude<SalesChannel, "online">>;

export function RecordSaleCustomerStep() {
  const { state } = useAdmin();
  const methods = useFormContext<RecordSaleValues>();
  const customerMode = useWatch({
    control: methods.control,
    name: "customerMode",
  });
  const channel = useWatch({ control: methods.control, name: "channel" });
  const customerId = useWatch({ control: methods.control, name: "customerId" });
  const customer = state.customers.find((item) => item.id === customerId);

  function setCustomerMode(mode: RecordSaleValues["customerMode"]) {
    methods.setValue("customerMode", mode, { shouldDirty: true });
    methods.clearErrors([
      "customerId",
      "customerName",
      "customerEmail",
      "customerPhone",
      "customerCity",
    ]);
  }

  return (
    <FieldGroup>
      <Controller
        control={methods.control}
        name="channel"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="record-sale-channel">Sale channel</FieldLabel>
            <Select onValueChange={(value) => value && field.onChange(value)} value={field.value}>
              <SelectTrigger
                aria-invalid={fieldState.invalid}
                className="h-12 w-full"
                id="record-sale-channel"
              >
                <span className="flex-1 truncate text-left">{channelLabels[channel]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Where the sale happened</SelectLabel>
                  {channels.map((value) => (
                    <SelectItem key={value} value={value}>
                      {channelLabels[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              This label is used in Orders, revenue reporting and customer history.
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Field>
        <FieldLabel>Customer record</FieldLabel>
        <div className="grid grid-cols-2 gap-2 rounded-[14px] border border-border bg-secondary/40 p-1.5">
          <Button
            onClick={() => setCustomerMode("existing")}
            type="button"
            variant={customerMode === "existing" ? "default" : "ghost"}
          >
            Existing customer
          </Button>
          <Button
            onClick={() => setCustomerMode("new")}
            type="button"
            variant={customerMode === "new" ? "default" : "ghost"}
          >
            New customer
          </Button>
        </div>
      </Field>

      {customerMode === "existing" ? (
        <Controller
          control={methods.control}
          name="customerId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="record-sale-customer">Customer</FieldLabel>
              <Select onValueChange={(value) => value && field.onChange(value)} value={field.value}>
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="h-12 w-full"
                  id="record-sale-customer"
                >
                  <span className="flex-1 truncate text-left">
                    {customer?.name ?? "Choose a customer"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Existing customers</SelectLabel>
                    {state.customers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {item.city}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(methods.formState.errors.customerName)}>
            <FieldLabel htmlFor="record-sale-customer-name">Name</FieldLabel>
            <Input
              aria-invalid={Boolean(methods.formState.errors.customerName)}
              autoComplete="name"
              id="record-sale-customer-name"
              placeholder="Customer name"
              {...methods.register("customerName")}
            />
            <FieldError errors={[methods.formState.errors.customerName]} />
          </Field>

          <Field data-invalid={Boolean(methods.formState.errors.customerCity)}>
            <FieldLabel htmlFor="record-sale-customer-city">City</FieldLabel>
            <Input
              aria-invalid={Boolean(methods.formState.errors.customerCity)}
              autoComplete="address-level2"
              id="record-sale-customer-city"
              placeholder="e.g. Ikeja"
              {...methods.register("customerCity")}
            />
            <FieldError errors={[methods.formState.errors.customerCity]} />
          </Field>

          <Field data-invalid={Boolean(methods.formState.errors.customerPhone)}>
            <FieldLabel htmlFor="record-sale-customer-phone">Phone</FieldLabel>
            <Input
              aria-invalid={Boolean(methods.formState.errors.customerPhone)}
              autoComplete="tel"
              id="record-sale-customer-phone"
              placeholder="+234…"
              type="tel"
              {...methods.register("customerPhone")}
            />
            <FieldError errors={[methods.formState.errors.customerPhone]} />
          </Field>

          <Field data-invalid={Boolean(methods.formState.errors.customerEmail)}>
            <FieldLabel htmlFor="record-sale-customer-email">Email</FieldLabel>
            <Input
              aria-invalid={Boolean(methods.formState.errors.customerEmail)}
              autoComplete="email"
              id="record-sale-customer-email"
              placeholder="Optional when phone is provided"
              type="email"
              {...methods.register("customerEmail")}
            />
            <FieldError errors={[methods.formState.errors.customerEmail]} />
          </Field>
        </div>
      )}
    </FieldGroup>
  );
}
