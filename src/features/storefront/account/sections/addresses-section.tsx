"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "../components/account-primitives";

export function AddressesSection() {
  const { openModal, toast } = useAccountUi();

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
        <AcctButton onClick={() => openModal("address")}>Add address</AcctButton>
      </header>

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <article className={cn("p-5 sm:p-6", panelElevatedClass)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <StatusBadge variant="success">Default shipping</StatusBadge>
              <StatusBadge variant="neutral">Billing</StatusBadge>
            </div>
            <Button size="lg" type="button" onClick={() => openModal("address")} variant="link">
              Edit
            </Button>
          </div>
          <address className="mt-6 not-italic leading-8">
            <strong>Ada Okafor</strong>
            <br />
            18 Example Road
            <br />
            Lekki Phase 1
            <br />
            Lagos, Nigeria
            <br />
            <span className={cn(monoClass, "text-sm")}>+234 801 234 5678</span>
          </address>
          <div className="mt-6 border-t border-[var(--acc-line)] pt-4 text-sm text-[var(--acc-muted)]">
            This address cannot be deleted until another default exists.
          </div>
        </article>

        <article className={cn("p-5 sm:p-6", panelClass)}>
          <div className="flex items-center justify-between gap-3">
            <StatusBadge variant="neutral">Additional</StatusBadge>
            <Button size="lg" type="button" onClick={() => openModal("address")} variant="link">
              Edit
            </Button>
          </div>
          <address className="mt-6 not-italic leading-8">
            <strong>Ada Okafor</strong>
            <br />2 Sample Avenue
            <br />
            Ikeja
            <br />
            Lagos, Nigeria
            <br />
            <span className={cn(monoClass, "text-sm")}>+234 801 234 5678</span>
          </address>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--acc-line)] pt-4">
            {/* TODO(button-action): Persist the default shipping address after the account address mutation is available. */}
            <AcctButton
              variant="secondary"
              onClick={() => toast("Changing the default address is not available yet.")}
            >
              Make default
            </AcctButton>
            <Button
              size="lg"
              type="button"
              onClick={() => openModal("delete-address")}
              variant="link"
            >
              Delete
            </Button>
          </div>
        </article>
      </div>
    </>
  );
}
