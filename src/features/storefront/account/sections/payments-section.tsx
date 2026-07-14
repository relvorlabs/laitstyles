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

export function PaymentsSection() {
  const { openModal, toast } = useAccountUi();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Tokenized methods only</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Payment methods.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            The provider owns card collection. The account stores safe descriptors only.
          </p>
        </div>
        <AcctButton onClick={() => openModal("payment")}>Add method</AcctButton>
      </header>

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <article className={cn("p-5 sm:p-6", panelElevatedClass)}>
          <div className="flex justify-between gap-4">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Visa</Eyebrow>
              <h2 className={cn("mt-4 text-4xl", monoClass)}>•••• 4242</h2>
              <p className="mt-2 text-[var(--acc-muted)]">Expires 08/28</p>
            </div>
            <StatusBadge variant="success">Default</StatusBadge>
          </div>
          <p className="mt-6 text-sm text-[var(--acc-muted)]">
            Billing address: 18 Example Road, Lagos
          </p>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-[var(--acc-line)] pt-4">
            {/* TODO(button-action): Open the billing-address editor after the payment provider exposes its update flow. */}
            <Button
              type="button"
              onClick={() => toast("Billing address updates are not available yet.")}
              className="h-auto p-0 text-sm font-semibold"
              variant="link"
            >
              Update billing
            </Button>
            <Button
              type="button"
              onClick={() => openModal("remove-payment")}
              className="h-auto p-0 text-sm font-semibold acc-fg-oxblood"
              variant="link"
            >
              Remove
            </Button>
          </div>
        </article>

        <article
          className={cn("border-l-[5px] border-l-[var(--acc-warning)] p-5 sm:p-6", panelClass)}
        >
          <div className="flex justify-between gap-4">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Mastercard</Eyebrow>
              <h2 className={cn("mt-4 text-4xl", monoClass)}>•••• 8910</h2>
              <p className="mt-2 text-[var(--acc-warning)]">Expired 04/26</p>
            </div>
            <StatusBadge variant="warning">Action required</StatusBadge>
          </div>
          <p className="mt-6 text-sm text-[var(--acc-muted)]">
            Replace this method before using it in a future checkout.
          </p>
          <AcctButton variant="secondary" className="mt-6" onClick={() => openModal("payment")}>
            Replace method
          </AcctButton>
        </article>
      </div>
    </>
  );
}
