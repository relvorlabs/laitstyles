"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
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

export function TicketDetailSection() {
  const { navigate, toast } = useAccountUi();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    event.currentTarget.reset();
    toast("Reply sent");
  }

  return (
    <>
      <Button
        size="lg"
        type="button"
        onClick={() => navigate("support")}
        className="mb-5"
        variant="link"
      >
        ← Back to support
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">
            Ticket <span className={monoClass}>#SP-0119</span>
          </Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,4.8rem)] font-normal leading-[.93]">
            Question about order #LS-1048.
          </h1>
        </div>
        <StatusBadge variant="warning">Waiting for you</StatusBadge>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="space-y-5 p-5 sm:p-6">
            <article className="ml-auto max-w-2xl rounded-[14px] bg-[var(--acc-ink)] p-5 text-[var(--acc-bone)]">
              <Eyebrow className="text-white/55">You · 11 July</Eyebrow>
              <p className="mt-3 leading-7">Can the delivery address be changed before dispatch?</p>
            </article>
            <article className="max-w-2xl rounded-[14px] bg-[var(--acc-bone-2)] p-5">
              <Eyebrow className="text-[var(--acc-muted)]">Support · 11 July</Eyebrow>
              <p className="mt-3 leading-7">
                The order has not been dispatched yet. Please confirm the replacement address.
              </p>
            </article>
          </div>
          <form className="border-t border-[var(--acc-line)] p-5 sm:p-6" onSubmit={onSubmit}>
            <FieldLabel className="block" htmlFor="ticket-reply">
              Reply
            </FieldLabel>
            <Textarea
              id="ticket-reply"
              className="mt-2"
              placeholder="Write a message"
              required
              textareaSize="lg"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              {/* TODO(button-action): Open an attachment picker after support uploads, file validation and storage are connected. */}
              <AcctButton
                variant="secondary"
                type="button"
                onClick={() => toast("File attachments are not available yet.")}
              >
                Attach file
              </AcctButton>
              <AcctButton type="submit">Send reply</AcctButton>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <section className={cn("p-5", panelClass)}>
            <Eyebrow className="text-[var(--acc-muted)]">Related order</Eyebrow>
            <h2 className={cn("mt-3 text-3xl", monoClass)}>#LS-1048</h2>
            <p className="mt-2 text-[var(--acc-muted)]">Shipped</p>
            <Button
              size="lg"
              type="button"
              onClick={() => navigate("order-detail")}
              className="mt-4"
              variant="link"
            >
              View order
            </Button>
          </section>
          <section className={cn("p-5", panelClass)}>
            <Eyebrow className="text-[var(--acc-muted)]">Ticket detail</Eyebrow>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold">Topic</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">Order change</dd>
              </div>
              <div>
                <dt className="font-semibold">Opened</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">11 July 2026</dd>
              </div>
              <div>
                <dt className="font-semibold">Status</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">Waiting for customer</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
