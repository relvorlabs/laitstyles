"use client";

import { UploadIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import { useAccountUi } from "../account-context";
import { ProductThumb } from "../components/account-garments";
import {
  AcctButton,
  Eyebrow,
  fieldClass,
  IconButton,
  monoClass,
  panelClass,
  StepNode,
  softClass,
} from "../components/account-primitives";

const steps = [
  { n: 1, label: "Items" },
  { n: 2, label: "Reason" },
  { n: 3, label: "Evidence" },
  { n: 4, label: "Method" },
  { n: 5, label: "Review" },
];

export function ReturnWizardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products } = useStorefrontCatalogueData();
  const { toast } = useAccountUi();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  function next() {
    if (step < 5) {
      setStep((current) => current + 1);
    } else {
      toast("Return request submitted");
      onClose();
      setStep(1);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="lst-account flex h-full max-h-none w-full max-w-full flex-col gap-0 overflow-hidden rounded-none bg-[var(--acc-surface)] p-0 text-[var(--acc-ink)] shadow-[var(--acc-shadow-md)] ring-0 sm:h-auto sm:max-h-[94vh] sm:max-w-4xl sm:rounded-[18px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--acc-line)] p-5 sm:p-6">
          <div>
            <Eyebrow className="text-[var(--acc-sage-deep)]">Return request</Eyebrow>
            <DialogTitle className="mt-3 font-serif text-4xl font-normal">
              Start a return.
            </DialogTitle>
          </div>
          <IconButton onClick={onClose} aria-label="Close return flow">
            <XIcon className="size-[18px]" />
          </IconButton>
        </div>

        <div className="border-b border-[var(--acc-line)] bg-[var(--acc-bone)] p-4">
          <ol className="grid grid-cols-5 gap-2" aria-label="Return steps">
            {steps.map((item) => (
              <li key={item.n} className="text-center">
                <StepNode state={item.n === step ? "active" : item.n < step ? "complete" : "idle"}>
                  {item.n}
                </StepNode>
                <span className="mt-2 hidden text-xs sm:block">{item.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {step === 1 ? (
            <section>
              <h3 className="font-serif text-3xl font-normal">Select eligible items.</h3>
              <p className="mt-3 text-[var(--acc-muted)]">
                Delivered quantities only. Already returned quantities stay excluded.
              </p>
              <label className="mt-6 grid gap-4 rounded-[14px] border border-[var(--acc-line-strong)] p-4 sm:grid-cols-[24px_96px_minmax(0,1fr)_auto] sm:items-center">
                <input type="checkbox" defaultChecked className="size-5 accent-[var(--acc-ink)]" />
                <ProductThumb product={products[1]} className="aspect-square" />
                <span>
                  <strong className="block">Boxy Wool City Blazer</strong>
                  <span className="mt-1 block text-sm text-[var(--acc-muted)]">
                    XL · Quantity 1 · Delivered 23 May
                  </span>
                </span>
                <span className={monoClass}>₦28,500</span>
              </label>
              <div className={cn(softClass, "mt-4 p-4")}>
                <p className="font-semibold">Broken-in Leather Moto</p>
                <p className="mt-2 text-sm text-[var(--acc-muted)]">
                  Not delivered yet, so a return cannot start.
                </p>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h3 className="font-serif text-3xl font-normal">Reason and resolution.</h3>
              <div className="mt-6 grid gap-5">
                <label className="block">
                  <span className="text-sm font-semibold">Return reason</span>
                  <select className={cn(fieldClass, "mt-2")}>
                    <option>Fit was not right</option>
                    <option>Item did not match expectations</option>
                    <option>Item arrived damaged</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="block" htmlFor="return-details">
                  <span className="text-sm font-semibold">Additional details</span>
                  <Textarea id="return-details" className={cn(fieldClass, "mt-2 min-h-28")} />
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold">Preferred resolution</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className={cn(panelClass, "flex min-h-20 items-center gap-3 p-4")}>
                      <input type="radio" name="resolution" defaultChecked />
                      Refund
                    </label>
                    <label className={cn(panelClass, "flex min-h-20 items-center gap-3 p-4")}>
                      <input type="radio" name="resolution" />
                      Exchange
                    </label>
                    <label className={cn(panelClass, "flex min-h-20 items-center gap-3 p-4")}>
                      <input type="radio" name="resolution" />
                      Store credit
                    </label>
                  </div>
                </fieldset>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <h3 className="font-serif text-3xl font-normal">Condition evidence.</h3>
              <p className="mt-3 text-[var(--acc-muted)]">
                Required only when the policy or reason needs it.
              </p>
              <Button
                type="button"
                onClick={() => toast("Return evidence uploads are not available yet.")}
                className="mt-6 w-full flex-col text-center"
                variant="ghost"
              >
                <UploadIcon className="size-[34px]" strokeWidth={1.7} />
                <strong className="mt-4">Add item or packaging photos</strong>
                <span className="mt-2 text-sm text-[var(--acc-muted)]">
                  JPG, PNG or WEBP · Backend limits apply
                </span>
              </Button>
            </section>
          ) : null}

          {step === 4 ? (
            <section>
              <h3 className="font-serif text-3xl font-normal">Choose return method.</h3>
              <div className="mt-6 grid gap-3">
                {[
                  {
                    title: "Courier pickup",
                    desc: "Fees and available dates come from the backend.",
                    checked: true,
                  },
                  {
                    title: "Customer drop-off",
                    desc: "Use the generated label and approved location.",
                    checked: false,
                  },
                  {
                    title: "Customer shipment",
                    desc: "Tracking must be added after dispatch.",
                    checked: false,
                  },
                ].map((method) => (
                  <label
                    key={method.title}
                    className={cn(panelClass, "flex min-h-24 items-start gap-3 p-4")}
                  >
                    <input
                      type="radio"
                      name="returnMethod"
                      defaultChecked={method.checked}
                      className="mt-1"
                    />
                    <span>
                      <strong className="block">{method.title}</strong>
                      <span className="mt-2 block text-sm text-[var(--acc-muted)]">
                        {method.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {step === 5 ? (
            <section>
              <h3 className="font-serif text-3xl font-normal">Review request.</h3>
              <dl className={cn(panelClass, "mt-6 divide-y divide-[var(--acc-line)]")}>
                {[
                  ["Item", "Boxy Wool City Blazer · XL"],
                  ["Reason", "Fit was not right"],
                  ["Resolution", "Refund to original method"],
                  ["Method", "Courier pickup"],
                ].map(([term, description]) => (
                  <div key={term} className="grid gap-2 p-4 sm:grid-cols-[180px_1fr]">
                    <dt className="font-semibold">{term}</dt>
                    <dd>{description}</dd>
                  </div>
                ))}
                <div className="grid gap-2 p-4 sm:grid-cols-[180px_1fr]">
                  <dt className="font-semibold">Estimated refund</dt>
                  <dd className={monoClass}>₦28,500, subject to inspection</dd>
                </div>
              </dl>
              <label className="mt-5 flex items-start gap-3">
                <input type="checkbox" className="mt-1 size-5 accent-[var(--acc-ink)]" />
                <span>
                  I confirm the item remains in the condition required by the return policy.
                </span>
              </label>
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--acc-line)] bg-[var(--acc-surface)] p-4 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <AcctButton
            variant="secondary"
            disabled={step === 1}
            onClick={() => setStep((current) => Math.max(1, current - 1))}
          >
            Back
          </AcctButton>
          <p className={cn(monoClass, "text-xs")}>{step} / 5</p>
          <AcctButton onClick={next}>{step === 5 ? "Submit return" : "Continue"}</AcctButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
