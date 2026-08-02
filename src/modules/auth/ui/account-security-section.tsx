"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useAccountSecurityFactors,
  useAccountSecuritySessions,
} from "@/modules/auth/client/account-security-hooks";
import type { MfaFactorSummary } from "@/modules/auth/types";
import {
  type AccountSecurityModalId,
  AccountSecurityModals,
} from "@/modules/auth/ui/account-security-modals";

const panelClass =
  "rounded-[14px] border border-[var(--acc-line)] bg-[color-mix(in_srgb,var(--acc-surface)_88%,transparent)]";
const panelElevatedClass =
  "rounded-[14px] border border-[var(--acc-line)] bg-[var(--acc-surface)] shadow-[var(--acc-shadow-sm)]";

export function AccountSecuritySection({ onNotice }: { onNotice?: (message: string) => void }) {
  const factorsQuery = useAccountSecurityFactors();
  const sessionsQuery = useAccountSecuritySessions();
  const [modal, setModal] = useState<AccountSecurityModalId | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<MfaFactorSummary | null>(null);
  const [notice, setNotice] = useState<string>();

  const factors = useMemo(
    () => uniqueFactors(factorsQuery.data?.factors ?? []),
    [factorsQuery.data],
  );
  const verifiedFactors = factors.filter((factor) => factor.status === "verified");

  function notify(message: string) {
    setNotice(message);
    onNotice?.(message);
  }

  function closeModal() {
    setModal(null);
    setSelectedFactor(null);
  }

  function removeFactor(factor: MfaFactorSummary) {
    setSelectedFactor(factor);
    setModal("mfa-remove");
  }

  return (
    <>
      <header>
        <Eyebrow>Account protection</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Security.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Keep your sign-in details protected and remove access from devices you no longer use.
        </p>
      </header>

      {notice ? (
        <p
          className="mt-6 rounded-[10px] bg-[var(--acc-sage)] p-4 text-sm font-semibold text-[var(--acc-sage-deep)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-7 space-y-5">
        <section className={`${panelElevatedClass} p-5 sm:p-6`}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow tone="muted">Email address</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Change your sign-in email.</h2>
              <p className="mt-2 text-[var(--acc-muted)]">
                We will send a confirmation link before your new email becomes active.
              </p>
            </div>
            <Button variant="outline" onClick={() => setModal("email")}>
              Change email
            </Button>
          </div>
        </section>

        <section className={`${panelElevatedClass} p-5 sm:p-6`}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow tone="muted">Password</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Choose a new password.</h2>
              <p className="mt-2 text-[var(--acc-muted)]">
                Enter your current password before choosing a new one.
              </p>
            </div>
            <Button variant="outline" onClick={() => setModal("password")}>
              Change password
            </Button>
          </div>
        </section>

        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--acc-line)] p-5 sm:p-6">
            <div>
              <Eyebrow tone="muted">Two-step verification</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">
                {verifiedFactors.length > 0 ? "Enabled." : "Not enabled."}
              </h2>
              <p className="mt-2 text-[var(--acc-muted)]">
                Add a six-digit code from an authenticator app when you sign in.
              </p>
            </div>
            <Button onClick={() => setModal("mfa-enroll")}>Add authenticator</Button>
          </div>

          {factorsQuery.isPending ? (
            <p className="p-5 text-sm text-[var(--acc-muted)] sm:p-6">Loading authenticators…</p>
          ) : factorsQuery.isError ? (
            <p className="p-5 text-sm text-destructive sm:p-6" role="alert">
              Your authenticators could not be loaded. Refresh the page and try again.
            </p>
          ) : factors.length === 0 ? (
            <p className="p-5 text-sm text-[var(--acc-muted)] sm:p-6">
              No authenticator app has been added yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--acc-line)]">
              {factors.map((factor) => (
                <article
                  className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
                  key={`account-authenticator:${factor.id}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{factor.friendlyName ?? "Authenticator app"}</p>
                      <StatusBadge status={factor.status} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--acc-muted)]">
                      {factor.status === "verified" ? "Ready to use" : "Setup not completed"}
                    </p>
                  </div>
                  <Button
                    variant="link"
                    className="justify-self-start sm:justify-self-end"
                    onClick={() => removeFactor(factor)}
                    aria-label={`Remove ${factor.friendlyName ?? "Authenticator app"}`}
                  >
                    Remove
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--acc-line)] p-5 sm:p-6">
            <div>
              <Eyebrow tone="muted">Signed-in devices</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">This device.</h2>
            </div>
            <Button variant="outline" onClick={() => setModal("signout-all")}>
              Sign out other devices
            </Button>
          </div>

          {sessionsQuery.isPending ? (
            <p className="p-5 text-sm text-[var(--acc-muted)] sm:p-6">Checking this device…</p>
          ) : sessionsQuery.isError || !sessionsQuery.data ? (
            <p className="p-5 text-sm text-destructive sm:p-6" role="alert">
              We could not confirm this sign-in. Sign in again before changing device access.
            </p>
          ) : (
            <div>
              <article className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold">Current device</p>
                    <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--acc-sage)] px-[.7rem] py-[.3rem] font-mono text-[.67rem] font-semibold uppercase tracking-[.08em] text-[var(--acc-sage-deep)]">
                      Active
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--acc-muted)]">
                    Signed in {formatAuthenticationTime(sessionsQuery.data.current.authenticatedAt)}
                  </p>
                </div>
                <span className="text-sm text-[var(--acc-muted)]">This device stays signed in</span>
              </article>
              <p className="border-t border-[var(--acc-line)] p-5 text-sm leading-6 text-[var(--acc-muted)] sm:p-6">
                For your privacy, other devices are not named here. You can still sign your account
                out everywhere else in one step.
              </p>
            </div>
          )}
        </section>
      </div>

      <AccountSecurityModals
        factor={selectedFactor}
        modal={modal}
        onClose={closeModal}
        onNotice={notify}
      />
    </>
  );
}

function Eyebrow({ children, tone = "sage" }: { children: string; tone?: "sage" | "muted" }) {
  return (
    <p
      className={`font-mono text-[.69rem] font-semibold uppercase leading-none tracking-[.13em] ${
        tone === "sage" ? "text-[var(--acc-sage-deep)]" : "text-[var(--acc-muted)]"
      }`}
    >
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: MfaFactorSummary["status"] }) {
  const verified = status === "verified";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-[.7rem] py-[.3rem] font-mono text-[.67rem] font-semibold uppercase tracking-[.08em] ${
        verified
          ? "bg-[var(--acc-sage)] text-[var(--acc-sage-deep)]"
          : "bg-[var(--acc-warning-surface)] text-[var(--acc-warning)]"
      }`}
    >
      {verified ? "Ready" : "Pending"}
    </span>
  );
}

function uniqueFactors(factors: readonly MfaFactorSummary[]): MfaFactorSummary[] {
  const byId = new Map<string, MfaFactorSummary>();
  for (const factor of factors) byId.set(factor.id, factor);
  return Array.from(byId.values());
}

function formatAuthenticationTime(value: string | null): string {
  if (!value) return "at an unknown time";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "at an unknown time";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
