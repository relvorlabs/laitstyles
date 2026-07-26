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
import { Textarea } from "@/components/ui/textarea";
import { formatNaira } from "@/lib/admin/shared/formatters";
import type { CreateReturnInput, EligibleReturnOrder } from "@/modules/returns/types";

type ReturnFormError = {
  field: "selection" | "quantity" | "reason" | "form";
  message: string;
};

export function CreateReturnDialog({
  orders,
  open,
  onOpenChange,
  onSubmit,
}: {
  orders: EligibleReturnOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateReturnInput) => Promise<string | null>;
}) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const order = orders.find((entry) => entry.id === orderId) ?? orders[0];
  const [orderLineId, setOrderLineId] = useState(order?.lines[0]?.id ?? "");
  const line = order?.lines.find((entry) => entry.id === orderLineId) ?? order?.lines[0];
  const eligible = line?.eligibleQuantity ?? 0;
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<ReturnFormError | null>(null);

  function changeOrder(nextOrderId: string) {
    const nextOrder = orders.find((entry) => entry.id === nextOrderId);
    setOrderId(nextOrderId);
    setOrderLineId(nextOrder?.lines[0]?.id ?? "");
    setQuantity(1);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !line) {
      setError({
        field: "selection",
        message: "Choose a delivered order line that is still eligible for return.",
      });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > eligible) {
      setError({
        field: "quantity",
        message: `Choose a return quantity between 1 and ${eligible}.`,
      });
      return;
    }
    if (!reason.trim()) {
      setError({ field: "reason", message: "Enter the reason for the return." });
      return;
    }

    const actionError = await onSubmit({
      orderId: order.id,
      reason: reason.trim(),
      note: note.trim(),
      lines: [{ orderLineId: line.id, quantity }],
    });
    setError(actionError ? { field: "form", message: actionError } : null);
  }

  const productLabel = line
    ? line.variantLabel
      ? `${line.productName} · ${line.variantLabel}`
      : line.productName
    : "Choose an order line";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(94dvh,760px)] overflow-y-auto overscroll-contain max-sm:inset-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:pb-[env(safe-area-inset-bottom)] sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[28px] font-medium">
            Start a customer return
          </DialogTitle>
          <DialogDescription>
            Only delivered, sold order lines with remaining eligible quantity appear. No payment
            provider is contacted.
          </DialogDescription>
        </DialogHeader>

        {orders.length ? (
          <form className="flex flex-col gap-5" onSubmit={submit}>
            <FieldGroup>
              <Field data-invalid={error?.field === "selection"}>
                <FieldLabel htmlFor="return-order">Delivered order</FieldLabel>
                <Select
                  onValueChange={(value) => value && changeOrder(value)}
                  value={order?.id ?? ""}
                >
                  <SelectTrigger
                    aria-invalid={error?.field === "selection"}
                    className="h-12 w-full"
                    id="return-order"
                  >
                    <span className="flex-1 truncate text-left">
                      {order ? `${order.id} · ${formatNaira(order.total)}` : "Choose an order"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Eligible delivered orders</SelectLabel>
                      {orders.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.id} · {entry.deliveryCity} · {formatNaira(entry.total)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={error?.field === "selection"}>
                <FieldLabel htmlFor="return-line">Product</FieldLabel>
                <Select
                  onValueChange={(value) => {
                    if (value) {
                      setOrderLineId(value);
                      setQuantity(1);
                      setError(null);
                    }
                  }}
                  value={line?.id ?? ""}
                >
                  <SelectTrigger
                    aria-invalid={error?.field === "selection"}
                    className="h-12 w-full"
                    id="return-line"
                  >
                    <span className="flex-1 truncate text-left">{productLabel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Eligible order lines</SelectLabel>
                      {order?.lines.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.productName} · {entry.eligibleQuantity} eligible
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={error?.field === "quantity"}>
                <FieldLabel htmlFor="return-quantity">Quantity</FieldLabel>
                <Input
                  aria-invalid={error?.field === "quantity"}
                  autoComplete="off"
                  id="return-quantity"
                  inputMode="numeric"
                  max={Math.max(eligible, 1)}
                  min={1}
                  name="return-quantity"
                  onChange={(event) => {
                    setQuantity(Number(event.target.value));
                    setError(null);
                  }}
                  type="number"
                  value={quantity}
                />
                <FieldDescription>{eligible} still eligible on this order line</FieldDescription>
              </Field>

              <Field data-invalid={error?.field === "reason"}>
                <FieldLabel htmlFor="return-reason">Reason</FieldLabel>
                <Input
                  aria-invalid={error?.field === "reason"}
                  autoComplete="off"
                  id="return-reason"
                  name="return-reason"
                  onChange={(event) => {
                    setReason(event.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Fit was not right…"
                  value={reason}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="return-note">Internal note</FieldLabel>
                <Textarea
                  autoComplete="off"
                  id="return-note"
                  name="return-note"
                  onChange={(event) => {
                    setNote(event.target.value);
                    setError(null);
                  }}
                  placeholder="Condition expected, collection arrangement, or customer context…"
                  value={note}
                />
              </Field>
            </FieldGroup>

            <FieldError aria-live="polite">{error?.message}</FieldError>

            <DialogFooter className="mx-0 mb-0 px-0 pb-[max(0rem,env(safe-area-inset-bottom))]">
              <Button size="lg" onClick={() => onOpenChange(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button size="lg" type="submit">
                Open return
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="rounded-[14px] border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
            No delivered order lines are currently eligible for a new return.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
