"use client";

import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  panelClass,
  panelElevatedClass,
} from "../components/account-primitives";

export function PrivacySection() {
  const { openModal, toast } = useAccountUi();

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Data and account control</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Privacy.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Make data controls explicit, honest and separate from marketing preferences.
        </p>
      </header>

      <div className="mt-7 space-y-5">
        <section className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="border-b border-[var(--acc-line)] p-5 sm:p-6">
            <h2 className="font-serif text-3xl font-normal">Privacy controls</h2>
          </div>
          <div className="divide-y divide-[var(--acc-line)]">
            <label className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6">
              <span>
                <strong className="block">Personalized recommendations</strong>
                <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                  Use account activity to improve suggestions
                </span>
              </span>
              <input type="checkbox" defaultChecked className="size-5 accent-[var(--acc-ink)]" />
            </label>
            <label className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6">
              <span>
                <strong className="block">Analytics consent</strong>
                <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                  Only when the privacy model allows user control
                </span>
              </span>
              <input type="checkbox" className="size-5 accent-[var(--acc-ink)]" />
            </label>
            <div className="flex min-h-20 items-center justify-between gap-5 p-5 sm:p-6">
              <span>
                <strong className="block">Recently viewed history</strong>
                <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                  12 products stored
                </span>
              </span>
              <button
                type="button"
                onClick={() => toast("Recently viewed history cleared.")}
                className="text-sm font-semibold underline underline-offset-4"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Data export</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">
                Download a copy of your account data.
              </h2>
              <p className="mt-3 max-w-2xl text-[var(--acc-muted)]">
                Exports should be prepared asynchronously and delivered through a secure, expiring
                link.
              </p>
            </div>
            <AcctButton variant="secondary" onClick={() => openModal("export")}>
              Request export
            </AcctButton>
          </div>
        </section>

        <section
          className={cn("border-l-[5px] border-l-[var(--acc-oxblood)] p-5 sm:p-6", panelClass)}
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow className="text-[var(--acc-oxblood)]">Danger zone</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Delete account.</h2>
              <p className="mt-3 max-w-2xl text-[var(--acc-muted)]">
                Active orders, returns, refunds or disputes can block the request until they
                resolve.
              </p>
            </div>
            <AcctButton variant="danger" onClick={() => openModal("delete")}>
              Review deletion
            </AcctButton>
          </div>
        </section>
      </div>
    </>
  );
}
