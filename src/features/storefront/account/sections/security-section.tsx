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

export function SecuritySection() {
  const { openModal, toast } = useAccountUi();

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Authentication and devices</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Security.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Protect sign-in methods and remove access you no longer recognize.
        </p>
      </header>

      <div className="mt-7 space-y-5">
        <section className={cn("p-5 sm:p-6", panelElevatedClass)}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Password</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Changed four months ago.</h2>
              <p className="mt-2 text-[var(--acc-muted)]">
                Social-only accounts should see Set password instead.
              </p>
            </div>
            <AcctButton variant="secondary" onClick={() => openModal("password")}>
              Change password
            </AcctButton>
          </div>
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Two-factor authentication</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Not enabled.</h2>
              <p className="mt-2 text-[var(--acc-muted)]">
                Only offer this when the authentication backend supports the complete lifecycle.
              </p>
            </div>
            {/* TODO(button-action): Start 2FA enrollment after Supabase recent-auth and verification APIs are configured. */}
            <AcctButton onClick={() => toast("Two-factor authentication is not available yet.")}>
              Enable 2FA
            </AcctButton>
          </div>
        </section>

        <section className={cn("overflow-hidden", panelClass)}>
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--acc-line)] p-5 sm:p-6">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Sessions and devices</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Where you are signed in.</h2>
            </div>
            <AcctButton variant="secondary" onClick={() => openModal("signout-all")}>
              Sign out others
            </AcctButton>
          </div>
          <div className="divide-y divide-[var(--acc-line)]">
            <article className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">Chrome on Windows</p>
                  <StatusBadge variant="success">Current</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-[var(--acc-muted)]">
                  Lagos · Active now · Signed in 10 July
                </p>
              </div>
              <span className="text-sm text-[var(--acc-muted)]">This browser</span>
            </article>
            <article className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
              <div>
                <p className="font-semibold">Safari on iPhone</p>
                <p className="mt-2 text-sm text-[var(--acc-muted)]">
                  Lagos · Last active 2 days ago
                </p>
              </div>
              <Button
                size="lg"
                type="button"
                onClick={() => openModal("revoke")}
                className="justify-self-start sm:justify-self-end"
                variant="link"
              >
                Revoke
              </Button>
            </article>
          </div>
        </section>

        <section className={cn("overflow-hidden", panelClass)}>
          <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
            <h2 className="font-serif text-3xl font-normal">Recent activity</h2>
          </div>
          <ol className="divide-y divide-[var(--acc-line)]">
            <li className="flex flex-wrap justify-between gap-4 p-5">
              <span>Sign-in from Chrome on Windows</span>
              <time className={cn("text-sm text-[var(--acc-muted)]", monoClass)}>Today 09:12</time>
            </li>
            <li className="flex flex-wrap justify-between gap-4 p-5">
              <span>Email verification completed</span>
              <time className="text-sm text-[var(--acc-muted)]">3 months ago</time>
            </li>
            <li className="flex flex-wrap justify-between gap-4 p-5">
              <span>Password changed</span>
              <time className="text-sm text-[var(--acc-muted)]">4 months ago</time>
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
