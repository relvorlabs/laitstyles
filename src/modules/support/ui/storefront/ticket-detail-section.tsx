"use client";

import { useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
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
} from "@/modules/storefront-shell/ui/account-primitives";
import { supportTicketQueryOptions, useReplyToTicket } from "@/modules/support/client/hooks";

export function TicketDetailSection({ ticketId }: { ticketId: string }) {
  const { navigate, toast } = useAccountUi();
  const ticket = useQuery(supportTicketQueryOptions(ticketId));
  const reply = useReplyToTicket();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    try {
      await reply.mutateAsync({ ticketId, body: String(form.get("body") ?? ""), attachments: [] });
      formElement.reset();
      toast("Reply sent");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The reply could not be sent.");
    }
  }

  if (!ticketId) return <p role="alert">Select a support ticket to view its conversation.</p>;
  if (ticket.isPending) return <p role="status">Loading support conversation...</p>;
  if (ticket.isError || !ticket.data)
    return <p role="alert">This support ticket could not be loaded.</p>;

  return (
    <>
      <Button
        size="lg"
        type="button"
        onClick={() => navigate("support")}
        className="mb-5"
        variant="link"
      >
        â† Back to support
      </Button>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">
            Ticket <span className={monoClass}>#{ticket.data.id.slice(0, 8)}</span>
          </Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,4.8rem)] font-normal leading-[.93]">
            {ticket.data.subject}.
          </h1>
        </div>
        <StatusBadge variant={ticket.data.status === "resolved" ? "success" : "warning"}>
          {ticket.data.status.replaceAll("_", " ")}
        </StatusBadge>
      </header>
      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="space-y-5 p-5 sm:p-6">
            {ticket.data.messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "max-w-2xl rounded-[14px] p-5",
                  message.authorKind === "customer"
                    ? "ml-auto bg-[var(--acc-ink)] text-[var(--acc-bone)]"
                    : "bg-[var(--acc-bone-2)]",
                )}
              >
                <Eyebrow
                  className={
                    message.authorKind === "customer" ? "text-white/55" : "text-[var(--acc-muted)]"
                  }
                >
                  {message.authorKind === "customer" ? "You" : "Support"} -{" "}
                  {new Date(message.createdAt).toLocaleDateString()}
                </Eyebrow>
                <p className="mt-3 leading-7">{message.body}</p>
                {message.attachments.length ? (
                  <ul className="mt-3 text-sm">
                    {message.attachments.map((asset) => (
                      <li key={asset.id}>{asset.fileName}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
          <form className="border-t border-[var(--acc-line)] p-5 sm:p-6" onSubmit={onSubmit}>
            <FieldLabel className="block" htmlFor="ticket-reply">
              Reply
            </FieldLabel>
            <Textarea
              id="ticket-reply"
              name="body"
              className="mt-2"
              placeholder="Write a message"
              required
              textareaSize="lg"
            />
            <p className="mt-3 text-sm text-[var(--acc-muted)]">
              Attachments are unavailable until the customer upload provider is configured.
            </p>
            {error ? (
              <p className="mt-3 text-[var(--acc-oxblood)]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <AcctButton disabled={reply.isPending} type="submit">
                {reply.isPending ? "Sending reply..." : "Send reply"}
              </AcctButton>
            </div>
          </form>
        </section>
        <aside>
          <section className={cn("p-5", panelClass)}>
            <Eyebrow className="text-[var(--acc-muted)]">Ticket detail</Eyebrow>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold">Topic</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">{ticket.data.category}</dd>
              </div>
              <div>
                <dt className="font-semibold">Opened</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">
                  {new Date(ticket.data.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Status</dt>
                <dd className="mt-1 text-[var(--acc-muted)]">
                  {ticket.data.status.replaceAll("_", " ")}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
