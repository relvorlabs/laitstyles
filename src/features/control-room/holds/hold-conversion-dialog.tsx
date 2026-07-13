"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  conversionPaymentLabels,
  paymentMethodLabels,
} from "@/features/control-room/holds/hold-labels";
import type { ConvertHoldInput, PaymentMethod, PaymentStatus } from "@/lib/control-room/types";

const paymentStatuses: Array<Extract<PaymentStatus, "pending" | "paid" | "deposit">> = [
  "pending",
  "paid",
  "deposit",
];

const paymentMethods: PaymentMethod[] = [
  "bank-transfer",
  "cash",
  "card",
  "pos",
  "pay-on-delivery",
  "other",
];

export function HoldConversionDialog({
  holdId,
  customerLabel,
  productName,
  initialCity,
  open,
  onOpenChange,
  onSubmit,
}: {
  holdId: string;
  customerLabel: string;
  productName: string;
  initialCity: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ConvertHoldInput) => string | null;
}) {
  const [paymentStatus, setPaymentStatus] =
    useState<Extract<PaymentStatus, "pending" | "paid" | "deposit">>("paid");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank-transfer");
  const [deliveryCity, setDeliveryCity] = useState(initialCity);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deliveryCity.trim()) {
      setError("Enter the delivery or pickup city before creating the order.");
      return;
    }

    const actionError = onSubmit({
      holdId,
      paymentStatus,
      paymentMethod,
      deliveryCity: deliveryCity.trim(),
      notes: notes.trim(),
    });
    setError(actionError);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(92dvh,760px)] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[28px] font-medium">
            Convert hold to order
          </DialogTitle>
          <DialogDescription>
            Transfer {productName} from {customerLabel}’s reservation into one connected order
            record. No payment provider is contacted.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hold-payment-status">Payment status</Label>
              <Select
                onValueChange={(value) => {
                  if (value) {
                    setPaymentStatus(
                      value as Extract<PaymentStatus, "pending" | "paid" | "deposit">,
                    );
                    setError(null);
                  }
                }}
                value={paymentStatus}
              >
                <SelectTrigger id="hold-payment-status" className="h-11 w-full">
                  <span className="flex-1 truncate text-left">
                    {conversionPaymentLabels[paymentStatus]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payment status</SelectLabel>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {conversionPaymentLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hold-payment-method">Payment method</Label>
              <Select
                onValueChange={(value) => {
                  if (value) {
                    setPaymentMethod(value as PaymentMethod);
                    setError(null);
                  }
                }}
                value={paymentMethod}
              >
                <SelectTrigger id="hold-payment-method" className="h-11 w-full">
                  <span className="flex-1 truncate text-left">
                    {paymentMethodLabels[paymentMethod]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payment method</SelectLabel>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {paymentMethodLabels[method]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hold-delivery-city">Delivery or pickup city</Label>
            <Input
              autoComplete="address-level2"
              id="hold-delivery-city"
              onChange={(event) => {
                setDeliveryCity(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Ikeja"
              value={deliveryCity}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hold-conversion-notes">Internal notes</Label>
            <Textarea
              id="hold-conversion-notes"
              onChange={(event) => {
                setNotes(event.target.value);
                setError(null);
              }}
              placeholder="Transfer reference, pickup arrangement, or staff note…"
              value={notes}
            />
          </div>

          {error ? (
            <p aria-live="polite" className="text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="mx-0 mb-0 px-0 pb-0">
            <Button
              className="h-11 rounded-full px-5"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Keep as hold
            </Button>
            <Button className="h-11 rounded-full px-5" type="submit">
              Create order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
