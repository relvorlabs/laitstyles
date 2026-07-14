"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  fieldClass,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "../components/account-primitives";

export function SupportSection() {
  const { navigate, openModal, toast } = useAccountUi();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Customer support</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Support.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Attach the right order or return before the conversation starts.
          </p>
        </div>
        <AcctButton onClick={() => openModal("support")}>Start request</AcctButton>
      </header>

      <section className={cn("mt-7 p-5 sm:p-6", panelClass)}>
        <label className="block">
          <span className="text-sm font-semibold">Search help</span>
          <input
            className={cn(fieldClass, "mt-2")}
            type="search"
            placeholder="Delivery, returns, measurements…"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* TODO(button-action): Open the delivery help article when support content routes exist. */}
          <AcctButton
            variant="secondary"
            onClick={() => toast("Delivery help is not available yet.")}
          >
            Delivery
          </AcctButton>
          {/* TODO(button-action): Open the returns help article when support content routes exist. */}
          <AcctButton
            variant="secondary"
            onClick={() => toast("Returns help is not available yet.")}
          >
            Returns
          </AcctButton>
          {/* TODO(button-action): Open the sizing help article when support content routes exist. */}
          <AcctButton
            variant="secondary"
            onClick={() => toast("Sizing help is not available yet.")}
          >
            Sizing
          </AcctButton>
        </div>
      </section>

      <section className="mt-6">
        <Eyebrow className="text-[var(--acc-muted)]">Recent tickets</Eyebrow>
        <div
          className={cn(
            "mt-4 divide-y divide-[var(--acc-line)] overflow-hidden",
            panelElevatedClass,
          )}
        >
          <Button
            type="button"
            onClick={() => navigate("ticket-detail")}
            className="grid min-h-0 w-full justify-stretch gap-4 rounded-none p-5 text-left sm:grid-cols-[1fr_auto]"
            variant="ghost"
          >
            <span>
              <Eyebrow className="text-[var(--acc-muted)]">
                Ticket <span className={monoClass}>#SP-0119</span>
              </Eyebrow>
              <strong className="mt-3 block">Question about order #LS-1048</strong>
              <span className="mt-2 block text-sm text-[var(--acc-muted)]">
                Support replied 5 days ago
              </span>
            </span>
            <StatusBadge variant="warning">Waiting for you</StatusBadge>
          </Button>
          <Button
            type="button"
            onClick={() => navigate("ticket-detail")}
            className="grid min-h-0 w-full justify-stretch gap-4 rounded-none p-5 text-left sm:grid-cols-[1fr_auto]"
            variant="ghost"
          >
            <span>
              <Eyebrow className="text-[var(--acc-muted)]">
                Ticket <span className={monoClass}>#SP-0084</span>
              </Eyebrow>
              <strong className="mt-3 block">Return pickup completed</strong>
              <span className="mt-2 block text-sm text-[var(--acc-muted)]">
                Resolved 2 months ago
              </span>
            </span>
            <StatusBadge variant="success">Resolved</StatusBadge>
          </Button>
        </div>
      </section>
    </>
  );
}
