"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAccountUi } from "@/modules/storefront-shell/ui/account-context";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
  type StatusVariant,
} from "@/modules/storefront-shell/ui/account-primitives";
import { supportTicketsQueryOptions, useCreateSupportTicket } from "@/modules/support/client/hooks";
import type { SupportTicketStatus, ValidatedTicketAttachment } from "@/modules/support/types";
import { SupportAttachmentPicker } from "./support-attachment-picker";

const statusVariant: Record<SupportTicketStatus, StatusVariant> = {
  open: "warning",
  pending_customer: "warning",
  pending_staff: "neutral",
  resolved: "success",
  closed: "neutral",
};

export function SupportSection() {
  const router = useRouter();
  const { toast } = useAccountUi();
  const tickets = useQuery(supportTicketsQueryOptions({ page: 1, pageSize: 25 }));
  const createTicket = useCreateSupportTicket();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ValidatedTicketAttachment[]>([]);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    try {
      const ticket = await createTicket.mutateAsync({
        subject: String(form.get("subject") ?? ""),
        category: form.get("category") as "order" | "payment" | "product" | "account" | "other",
        body: String(form.get("body") ?? ""),
        attachments: attachments.map(({ assetId, fileName }) => ({ assetId, fileName })),
      });
      formElement.reset();
      setAttachments([]);
      setShowForm(false);
      toast("Support request created");
      router.push(`/account/support/detail?ticketId=${encodeURIComponent(ticket.id)}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The support request could not be created.",
      );
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Customer support</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Support.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Start and continue conversations connected to your account.
          </p>
        </div>
        <AcctButton onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Close request form" : "Start request"}
        </AcctButton>
      </header>

      {showForm ? (
        <form className={cn("mt-7 grid gap-5 p-5 sm:p-6", panelClass)} onSubmit={submitTicket}>
          <label>
            <span className="text-sm font-semibold">Topic</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-[var(--acc-line)] bg-transparent px-3"
              defaultValue="other"
              name="category"
            >
              <option value="order">Order question</option>
              <option value="payment">Return or payment</option>
              <option value="product">Product information</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label htmlFor="support-subject">
            <span className="text-sm font-semibold">Subject</span>
            <Input className="mt-2" id="support-subject" name="subject" required />
          </label>
          <label htmlFor="support-body">
            <span className="text-sm font-semibold">Message</span>
            <Textarea className="mt-2" id="support-body" name="body" required textareaSize="lg" />
          </label>
          <SupportAttachmentPicker value={attachments} onChange={setAttachments} />
          {error ? (
            <p role="alert" className="text-[var(--acc-oxblood)]">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <AcctButton disabled={createTicket.isPending} type="submit">
              {createTicket.isPending ? "Submitting request..." : "Submit request"}
            </AcctButton>
          </div>
        </form>
      ) : null}

      <section className="mt-7">
        <Eyebrow className="text-[var(--acc-muted)]">Recent tickets</Eyebrow>
        {tickets.isPending ? (
          <p className="mt-4" role="status">
            Loading support tickets...
          </p>
        ) : null}
        {tickets.isError ? (
          <p className="mt-4" role="alert">
            Support tickets could not be loaded. Try again.
          </p>
        ) : null}
        {tickets.data?.data.length === 0 ? (
          <p className={cn("mt-4 p-6 text-[var(--acc-muted)]", panelElevatedClass)}>
            You have no support tickets.
          </p>
        ) : null}
        {tickets.data?.data.length ? (
          <div
            className={cn(
              "mt-4 divide-y divide-[var(--acc-line)] overflow-hidden",
              panelElevatedClass,
            )}
          >
            {tickets.data.data.map((ticket) => (
              <Button
                key={ticket.id}
                type="button"
                onClick={() =>
                  router.push(`/account/support/detail?ticketId=${encodeURIComponent(ticket.id)}`)
                }
                className="grid w-full justify-stretch gap-4 text-left sm:grid-cols-[1fr_auto]"
                variant="ghost"
              >
                <span>
                  <Eyebrow className="text-[var(--acc-muted)]">
                    Ticket <span className={monoClass}>#{ticket.id.slice(0, 8)}</span>
                  </Eyebrow>
                  <strong className="mt-3 block">{ticket.subject}</strong>
                  <span className="mt-2 block text-sm text-[var(--acc-muted)]">
                    Updated{" "}
                    {new Date(ticket.lastMessageAt ?? ticket.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <StatusBadge variant={statusVariant[ticket.status]}>
                  {ticket.status.replaceAll("_", " ")}
                </StatusBadge>
              </Button>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
