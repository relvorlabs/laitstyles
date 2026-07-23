"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  ProgressTrack,
  panelClass,
  panelElevatedClass,
  TimelineDot,
} from "../components/account-primitives";

export function ReturnDetailSection() {
  const { navigate, toast } = useAccountUi();

  return (
    <>
      <Button
        size="lg"
        type="button"
        onClick={() => navigate("returns")}
        className="mb-5"
        variant="link"
      >
        ← Back to returns
      </Button>

      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Return detail</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
          Return <span className={cn(monoClass, "text-[.6em]")}>#RT-0038</span>
        </h1>
        <p className="mt-4 text-[var(--acc-muted)]">
          Related order <span className={monoClass}>#LS-0924</span>
        </p>
      </header>

      <section
        className={cn(
          "mt-7 border-l-[5px] border-[var(--acc-warning)] p-5 sm:p-6",
          panelElevatedClass,
        )}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Eyebrow className="text-[var(--acc-warning)]">Next action</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-normal">Send the item by 20 July.</h2>
            <p className="mt-3 text-[var(--acc-muted)]">
              Use the generated label or arrange pickup through support.
            </p>
          </div>
          {/* TODO(button-action): Download a signed return label after the returns service exposes a label endpoint. */}
          <AcctButton onClick={() => toast("Return label download is not available yet.")}>
            Download label
          </AcctButton>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className={cn("p-5 sm:p-6", panelClass)}>
          <h2 className="font-serif text-3xl font-normal">Progress</h2>
          <ProgressTrack>
            <li className="grid grid-cols-[31px_1fr] gap-4">
              <TimelineDot state="complete">✓</TimelineDot>
              <div>
                <p className="font-semibold">Request submitted</p>
                <p className="mt-1 text-sm text-[var(--acc-muted)]">15 Jul · 11:20</p>
              </div>
            </li>
            <li className="grid grid-cols-[31px_1fr] gap-4">
              <TimelineDot state="complete">✓</TimelineDot>
              <div>
                <p className="font-semibold">Approved</p>
                <p className="mt-1 text-sm text-[var(--acc-muted)]">15 Jul · 16:45</p>
              </div>
            </li>
            <li className="grid grid-cols-[31px_1fr] gap-4">
              <TimelineDot state="complete">!</TimelineDot>
              <div>
                <p className="font-semibold">Awaiting shipment</p>
                <p className="mt-1 text-sm text-[var(--acc-warning)]">Action required</p>
              </div>
            </li>
            <li className="grid grid-cols-[31px_1fr] gap-4">
              <TimelineDot state="pending">4</TimelineDot>
              <div>
                <p className="font-semibold text-[var(--acc-muted)]">Inspection and refund</p>
                <p className="mt-1 text-sm text-[var(--acc-muted)]">Pending</p>
              </div>
            </li>
          </ProgressTrack>
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">Request summary</Eyebrow>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-sm font-semibold">Reason</dt>
              <dd className="mt-1 text-[var(--acc-muted)]">Fit was smaller than expected</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Resolution</dt>
              <dd className="mt-1 text-[var(--acc-muted)]">Refund to original method</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Estimated refund</dt>
              <dd className={cn("mt-1 text-xl", monoClass)}>₦24,000</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Method</dt>
              <dd className="mt-1 text-[var(--acc-muted)]">Customer drop-off</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
