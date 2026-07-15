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

type PaymentMethod = {
  brand: string;
  last4: string;
  expiry: string;
  billingAddress: string;
  status: "default" | "expired";
};

const methods: PaymentMethod[] = [
  {
    brand: "Visa",
    last4: "4242",
    expiry: "08/28",
    billingAddress: "18 Example Road, Lagos",
    status: "default",
  },
  {
    brand: "Mastercard",
    last4: "8910",
    expiry: "04/26",
    billingAddress: "18 Example Road, Lagos",
    status: "expired",
  },
];

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
        {methods.map((method) => {
          const isExpired = method.status === "expired";
          return (
            <article
              key={`${method.brand}-${method.last4}`}
              className={cn(
                "flex flex-col p-5 sm:p-6",
                isExpired
                  ? cn("border-l-[5px] border-l-[var(--acc-warning)]", panelClass)
                  : panelElevatedClass,
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <Eyebrow className="text-[var(--acc-muted)]">{method.brand}</Eyebrow>
                <StatusBadge variant={isExpired ? "warning" : "success"}>
                  {isExpired ? "Action required" : "Default"}
                </StatusBadge>
              </div>

              <div
                className={cn(
                  "mt-4 flex items-center justify-between gap-4 rounded-[12px] px-5 py-6",
                  isExpired
                    ? "bg-[var(--acc-bone-2)] opacity-70"
                    : "bg-[var(--acc-ink)] text-[var(--acc-bone)] shadow-[var(--acc-shadow-sm)]",
                )}
              >
                <h2 className={cn("text-2xl tracking-[.06em] sm:text-3xl", monoClass)}>
                  •••• {method.last4}
                </h2>
                <p
                  className={cn(
                    "text-sm",
                    isExpired
                      ? "font-semibold text-[var(--acc-warning)]"
                      : "text-[color-mix(in_srgb,var(--acc-bone)_70%,transparent)]",
                  )}
                >
                  {isExpired ? `Expired ${method.expiry}` : `Exp ${method.expiry}`}
                </p>
              </div>

              <p className="mt-5 text-sm text-[var(--acc-muted)]">
                Billing address: {method.billingAddress}
              </p>

              {isExpired ? (
                <p className="mt-1 text-sm text-[var(--acc-warning)]">
                  Replace this method before using it in a future checkout.
                </p>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-[var(--acc-line)] pt-4">
                {isExpired ? (
                  <AcctButton variant="secondary" onClick={() => openModal("payment")}>
                    Replace method
                  </AcctButton>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
