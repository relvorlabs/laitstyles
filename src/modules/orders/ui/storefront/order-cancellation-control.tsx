"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRequestAccountOrderCancellation } from "@/modules/orders/client/hooks";

const reasons = ["Ordered by mistake", "Need to change delivery details", "Other"];

export function OrderCancellationControl({ orderNumber }: { orderNumber: string }) {
  const mutation = useRequestAccountOrderCancellation();
  const router = useRouter();
  const [reason, setReason] = useState(reasons[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await mutation.mutateAsync({ orderNumber, reason });
      toast.success("Order cancelled.");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "We could not cancel this order.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="mt-6 flex flex-col gap-3 border-t border-[var(--acc-line)] pt-5 sm:flex-row sm:items-end"
      onSubmit={submit}
    >
      <label className="grid flex-1 gap-2 text-sm font-semibold">
        Cancellation reason
        <select
          className="h-11 rounded-lg border border-input bg-control px-3 font-normal"
          disabled={pending}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        >
          {reasons.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <Button disabled={pending} type="submit" variant="destructive">
        {pending ? "Cancelling..." : "Cancel order"}
      </Button>
      {error ? (
        <Alert className="sm:basis-full" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
