"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import type { ConvertHoldInput } from "@/modules/holds/types";

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
  onSubmit: (input: ConvertHoldInput & { holdId: string }) => Promise<string | null>;
}) {
  const [deliveryCity, setDeliveryCity] = useState(initialCity);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deliveryCity.trim()) {
      setError("Enter the delivery or pickup city before creating the order.");
      return;
    }

    const actionError = await onSubmit({
      holdId,
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
            record.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <Alert>
            <AlertTitle>Payment remains pending</AlertTitle>
            <AlertDescription>
              Converting the hold does not record cash or declare a payment successful. The reserved
              stock remains attached to the new order until a server-verified payment flow settles
              it.
            </AlertDescription>
          </Alert>

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
              placeholder="Pickup arrangement or staff note…"
              value={notes}
            />
          </div>

          {error ? (
            <p aria-live="polite" className="text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="mx-0 mb-0 px-0 pb-0">
            <Button size="lg" onClick={() => onOpenChange(false)} type="button" variant="outline">
              Keep as hold
            </Button>
            <Button size="lg" type="submit">
              Create pending order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
