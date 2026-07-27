"use client";

import { MailPlus, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManagerMember } from "@/modules/auth/server/staff-invitations";

export function TeamWorkspace({ initialMembers }: { initialMembers: ManagerMember[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submitInvitation() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/v1/auth/invitations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as
        | { ok: true; member: ManagerMember; message: string }
        | { ok: false; message: string; fieldErrors?: Record<string, string> };

      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setMembers((current) => [result.member, ...current.filter((member) => member.id !== result.member.id)]);
      setForm({ firstName: "", lastName: "", email: "" });
      setMessage({ tone: "success", text: result.message });
    } catch {
      setMessage({ tone: "error", text: "The invitation could not be sent. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-4 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Owner-controlled access
          </div>
          <h1 className="font-serif text-4xl font-medium tracking-tight">Store team</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite store managers through Supabase Auth. Managers complete their own password and profile from the email link and receive manager permissions—not owner access.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm shadow-sm">
          <strong className="block text-2xl font-semibold">{members.length}</strong>
          <span className="text-muted-foreground">manager{members.length === 1 ? "" : "s"}</span>
        </div>
      </header>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,.85fr)_minmax(520px,1.15fr)]">
        <section className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MailPlus className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-medium">Invite a manager</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Supabase sends the invitation. The recipient chooses their password after opening it.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={fieldErrors.firstName}>
              <Input
                autoComplete="given-name"
                disabled={pending}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                placeholder="First name"
                value={form.firstName}
              />
            </Field>
            <Field label="Last name" error={fieldErrors.lastName}>
              <Input
                autoComplete="family-name"
                disabled={pending}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                placeholder="Last name"
                value={form.lastName}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Work email" error={fieldErrors.email}>
              <Input
                autoComplete="email"
                disabled={pending}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="manager@example.com"
                type="email"
                value={form.email}
              />
            </Field>
          </div>

          {message ? (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                message.tone === "success"
                  ? "border-primary/20 bg-primary/10 text-foreground"
                  : "border-destructive/20 bg-destructive/10 text-destructive"
              }`}
              role={message.tone === "error" ? "alert" : "status"}
            >
              {message.text}
            </div>
          ) : null}

          <Button className="mt-6 w-full" disabled={pending} onClick={submitInvitation} size="lg" type="button">
            {pending ? "Sending invitation…" : "Send manager invitation"}
          </Button>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted text-foreground">
              <UserRoundCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-medium">Managers</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Invited accounts remain managers throughout setup. They are never elevated to store owner.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
                No store managers have been invited yet.
              </div>
            ) : (
              members.map((member) => (
                <article className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between" key={member.id}>
                  <div className="min-w-0">
                    <div className="font-semibold">{member.displayName}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${member.state === "active" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                      {member.state === "active" ? "Active" : "Invite sent"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}
