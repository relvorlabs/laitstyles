"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useCreateOwnedAddress,
  useDeleteOwnedAddress,
  useUpdateOwnedAddress,
} from "@/modules/customers/client/account-hooks";
import type { OwnedAddress } from "@/modules/customers/types";
import {
  Eyebrow,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "@/modules/storefront-shell/ui/account-primitives";

export function AddressesSection({ initialAddresses }: { initialAddresses: OwnedAddress[] }) {
  const router = useRouter();
  const createMutation = useCreateOwnedAddress();
  const updateMutation = useUpdateOwnedAddress();
  const deleteMutation = useDeleteOwnedAddress();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function makeDefault(addressId: string) {
    setPendingId(addressId);
    try {
      await updateMutation.mutateAsync({ addressId, input: { isDefault: true } });
      toast.success("Default address updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not update this address.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(addressId: string) {
    setPendingId(addressId);
    try {
      await deleteMutation.mutateAsync(addressId);
      toast.success("Address deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not delete this address.");
    } finally {
      setPendingId(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setCreating(true);
    try {
      await createMutation.mutateAsync({
        label: String(data.get("label") ?? ""),
        line1: String(data.get("line1") ?? ""),
        line2: String(data.get("line2") ?? ""),
        city: String(data.get("city") ?? ""),
        state: String(data.get("state") ?? ""),
        deliveryNotes: String(data.get("deliveryNotes") ?? ""),
        isDefault: data.get("isDefault") === "on",
      });
      toast.success("Address saved.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not save this address.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Delivery and billing</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Addresses.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Changes apply to future checkouts, never silently to an order already placed.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg">
          Add address
        </Button>
      </header>

      {initialAddresses.length ? (
        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          {initialAddresses.map((address) => (
            <article
              className={cn("p-5 sm:p-6", address.isDefault ? panelElevatedClass : panelClass)}
              key={address.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge variant={address.isDefault ? "success" : "neutral"}>
                  {address.isDefault ? "Default shipping" : address.label}
                </StatusBadge>
              </div>
              <address className="mt-6 not-italic leading-8">
                <strong>{address.label}</strong>
                <br />
                {address.line1}
                <br />
                {address.line2 ? (
                  <>
                    {address.line2}
                    <br />
                  </>
                ) : null}
                {[address.city, address.state, address.country].filter(Boolean).join(", ")}
              </address>
              {address.deliveryNotes ? (
                <p className="mt-4 text-sm text-[var(--acc-muted)]">{address.deliveryNotes}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--acc-line)] pt-4">
                {!address.isDefault ? (
                  <Button
                    disabled={pendingId === address.id}
                    onClick={() => makeDefault(address.id)}
                    size="lg"
                    variant="outline"
                  >
                    Make default
                  </Button>
                ) : null}
                <Button
                  disabled={pendingId === address.id}
                  onClick={() => remove(address.id)}
                  size="lg"
                  variant="link"
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={cn("mt-7 border-dashed p-10 text-center", panelClass)}>
          No delivery addresses saved yet.
        </div>
      )}

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add address</DialogTitle>
            <DialogDescription>Save a delivery address for future checkouts.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={create}>
            <Input aria-label="Address label" name="label" placeholder="Home" />
            <Input
              aria-label="Address line 1"
              className="sm:col-span-2"
              name="line1"
              placeholder="Street address"
              required
            />
            <Input
              aria-label="Address line 2"
              className="sm:col-span-2"
              name="line2"
              placeholder="Apartment or landmark"
            />
            <Input aria-label="City" name="city" placeholder="City" required />
            <Input aria-label="State" name="state" placeholder="State" />
            <Textarea
              aria-label="Delivery notes"
              className="sm:col-span-2"
              name="deliveryNotes"
              placeholder="Delivery notes"
            />
            <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
              <input className="size-5" name="isDefault" type="checkbox" />
              Set as default shipping address
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button disabled={creating} type="submit">
                {creating ? "Saving..." : "Save address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
