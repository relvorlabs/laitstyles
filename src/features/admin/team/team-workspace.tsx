"use client";

import { MailPlus, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/http/client";
import { inviteManagerRequest } from "@/modules/auth/client/staff-invitation-api";
import type { ManagerMember } from "@/modules/auth/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteFormField = "firstName" | "lastName" | "email";

function validateInviteField(field: InviteFormField, value: string): string | undefined {
  const trimmed = value.trim();
  if (field === "firstName" && !trimmed) return "Enter a first name.";
  if (field === "lastName" && !trimmed) return "Enter a last name.";
  if (field === "email") {
    if (!trimmed) return "Enter a work email.";
    if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  }
  return undefined;
}

export function TeamWorkspace({ initialMembers }: { initialMembers: ManagerMember[] }) {
  const [members, setMembers] = useState(() => uniqueMembers(initialMembers));
  const visibleMembers = useMemo(() => uniqueMembers(members), [members]);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [touched, setTouched] = useState<Record<InviteFormField, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<InviteFormField, string>>>({});

  function fieldError(field: InviteFormField): string | undefined {
    return (
      fieldErrors[field] ?? (touched[field] ? validateInviteField(field, form[field]) : undefined)
    );
  }

  function fieldValid(field: InviteFormField): boolean {
    return touched[field] && !fieldError(field) && form[field].trim().length > 0;
  }

  async function submitInvitation() {
    if (pending) return;
    setTouched({ firstName: true, lastName: true, email: true });

    const localErrors: Partial<Record<InviteFormField, string>> = {};
    for (const field of ["firstName", "lastName", "email"] as const) {
      const localError = validateInviteField(field, form[field]);
      if (localError) localErrors[field] = localError;
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setMessage({
        tone: "error",
        text: "Fix the highlighted fields before sending the invitation.",
      });
      return;
    }

    setPending(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const result = await inviteManagerRequest(form);
      setMembers((current) => uniqueMembers([result.member, ...current]));
      setForm({ firstName: "", lastName: "", email: "" });
      setTouched({ firstName: false, lastName: false, email: false });
      setMessage({ tone: "success", text: result.message });
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        setMessage({ tone: "error", text: error.message });
        setFieldErrors(readInvitationFieldErrors(error.fieldErrors));
      } else {
        setMessage({
          tone: "error",
          text: "The invitation could not be sent. Check your connection and try again.",
        });
      }
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
            Invite trusted managers to help with inventory, orders and customer care. Store
            ownership remains with the owner.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm shadow-sm">
          <strong className="block text-2xl font-semibold">{visibleMembers.length}</strong>
          <span className="text-muted-foreground">
            manager{visibleMembers.length === 1 ? "" : "s"}
          </span>
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
                We will email an invitation so they can choose a password and join the store team.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldError("firstName"))}>
              <FieldLabel htmlFor="invite-first-name">First name</FieldLabel>
              <Input
                aria-invalid={Boolean(fieldError("firstName"))}
                autoComplete="given-name"
                disabled={pending}
                id="invite-first-name"
                inputSize="lg"
                isValid={fieldValid("firstName")}
                onBlur={() => setTouched((current) => ({ ...current, firstName: true }))}
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
                placeholder="First name"
                value={form.firstName}
              />
              <FieldError>{fieldError("firstName")}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldError("lastName"))}>
              <FieldLabel htmlFor="invite-last-name">Last name</FieldLabel>
              <Input
                aria-invalid={Boolean(fieldError("lastName"))}
                autoComplete="family-name"
                disabled={pending}
                id="invite-last-name"
                inputSize="lg"
                isValid={fieldValid("lastName")}
                onBlur={() => setTouched((current) => ({ ...current, lastName: true }))}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
                }
                placeholder="Last name"
                value={form.lastName}
              />
              <FieldError>{fieldError("lastName")}</FieldError>
            </Field>
          </div>
          <div className="mt-4">
            <Field data-invalid={Boolean(fieldError("email"))}>
              <FieldLabel htmlFor="invite-email">Work email</FieldLabel>
              <Input
                aria-invalid={Boolean(fieldError("email"))}
                autoComplete="email"
                disabled={pending}
                id="invite-email"
                inputSize="lg"
                isValid={fieldValid("email")}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="manager@example.com"
                type="email"
                value={form.email}
              />
              <FieldError>{fieldError("email")}</FieldError>
              {fieldValid("email") ? <FieldSuccess>Looks good.</FieldSuccess> : null}
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

          <Button
            className="mt-6 w-full"
            disabled={pending}
            onClick={submitInvitation}
            size="lg"
            type="button"
          >
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
                Managers can run daily store operations without receiving ownership access.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {visibleMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
                No store managers have been invited yet.
              </div>
            ) : (
              visibleMembers.map((member) => (
                <article
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={`store-manager:${member.id}`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{member.displayName || "Store manager"}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {member.email || "Email unavailable"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        member.state === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                    >
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

function uniqueMembers(members: readonly ManagerMember[]): ManagerMember[] {
  const byId = new Map<string, ManagerMember>();
  for (const member of members) {
    if (!member?.id) continue;
    byId.set(member.id, member);
  }
  return Array.from(byId.values());
}

function readInvitationFieldErrors(
  fieldErrors: Record<string, string[]> | undefined,
): Partial<Record<InviteFormField, string>> {
  if (!fieldErrors) return {};
  const result: Partial<Record<InviteFormField, string>> = {};
  for (const field of ["firstName", "lastName", "email"] as const) {
    const message = fieldErrors[field]?.at(0);
    if (message) result[field] = message;
  }
  return result;
}
