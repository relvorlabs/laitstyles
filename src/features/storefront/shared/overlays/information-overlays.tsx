"use client";

import type { FormEvent, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { IconClose } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

export function InformationOverlays() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };
  const onDeliverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const area = new FormData(event.currentTarget).get("area")?.toString().trim() ?? "";
    storefront.setDeliveryStatus(
      area.length < 3
        ? "Enter a valid state or delivery area."
        : `Estimated delivery to ${area}: 2–5 business days. Final fee is confirmed at checkout.`,
    );
  };

  const onSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    storefront.closeAll();
    storefront.showToast("Your question has been recorded.");
  };

  return (
    <>
      <div
        id="conditionModal"
        className={`overlay modal-wrap${storefront.openId === "conditionModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Condition guide"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Condition guide</h2>
            <Button
              type="button"
              aria-label="Close condition guide"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade A+ — Like new</h3>
                <span className="badge badge-sage">A+</span>
              </div>
              <p>
                Minimal or no visible wear. No stains, structural damage, stretched areas or damaged
                fastenings.
              </p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade A — Excellent</h3>
                <span className="badge">A</span>
              </div>
              <p>
                Very light signs of normal use while remaining highly presentable and ready to wear.
              </p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade B+ — Good</h3>
                <span className="badge">B+</span>
              </div>
              <p>A wearable piece with a minor flaw photographed and described before purchase.</p>
            </article>
          </div>
        </section>
      </div>

      <div
        id="measureModal"
        className={`overlay modal-wrap${storefront.openId === "measureModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Measurements and fit"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Measurements and fit</h2>
            <Button
              type="button"
              aria-label="Close measurements"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <p className="text-[0.84rem] text-[var(--muted)]">
            Pre-owned garments may fit differently from their tagged size. Compare these
            measurements with a similar piece you already own.
          </p>
          <div className="measure-grid">
            <div className="measure-illustration">
              <div className="garment-shape" />
            </div>
            <div>
              <div className="unit-switch">
                <Button
                  type="button"
                  aria-pressed={storefront.measureUnit === "cm"}
                  onClick={() => storefront.setMeasureUnit("cm")}
                  variant="ghost"
                >
                  Centimetres
                </Button>
                <Button
                  type="button"
                  aria-pressed={storefront.measureUnit === "in"}
                  onClick={() => storefront.setMeasureUnit("in")}
                  variant="ghost"
                >
                  Inches
                </Button>
              </div>
              <dl id="measureList" className="measure-table">
                {Object.entries(storefront.measurementsCm).map(([key, value]) => (
                  <div key={key} className="measure-row">
                    <dt>{key}</dt>
                    <dd className="mono">
                      {storefront.measureUnit === "cm"
                        ? `${value} cm`
                        : `${(value / 2.54).toFixed(1)} in`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </div>

      <div
        id="deliveryModal"
        className={`overlay modal-wrap${storefront.openId === "deliveryModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Delivery estimate"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Delivery estimate</h2>
            <Button
              type="button"
              aria-label="Close delivery estimate"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <form id="deliveryForm" className="mt-5" onSubmit={onDeliverySubmit}>
            <div className="field">
              <label htmlFor="deliveryArea">State or delivery area</label>
              <input id="deliveryArea" name="area" required placeholder="e.g. Lagos" />
            </div>
            <Button className="mt-3" type="submit">
              Check estimate
            </Button>
            <p id="deliveryStatus" className="text-[0.8rem]" aria-live="polite">
              {storefront.deliveryStatus}
            </p>
          </form>
        </section>
      </div>

      <div
        id="authModal"
        className={`overlay modal-wrap${storefront.openId === "authModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Brand labelling"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Brand labelling</h2>
            <Button
              type="button"
              aria-label="Close brand labelling"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            <article className="guide-card">
              <h3>Branded</h3>
              <p>
                A recognised label is visible on the garment. This is not automatically an
                independent authenticity claim.
              </p>
            </article>
            <article className="guide-card">
              <h3>Unverified</h3>
              <p>Branding is visible, but authenticity has not been independently confirmed.</p>
            </article>
            <article className="guide-card">
              <h3>Designer-inspired</h3>
              <p>The piece references a design language without claiming a specific origin.</p>
            </article>
            <article className="guide-card">
              <h3>Unbranded</h3>
              <p>Selected for fabric, fit, condition and everyday usefulness.</p>
            </article>
          </div>
        </section>
      </div>

      <div
        id="supportModal"
        className={`overlay modal-wrap${storefront.openId === "supportModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ask about a product"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Ask about a product</h2>
            <Button
              type="button"
              aria-label="Close support form"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <form id="supportForm" className="mt-5 grid gap-[14px]" onSubmit={onSupportSubmit}>
            <div className="field">
              <label htmlFor="supportTopic">Topic</label>
              <select id="supportTopic" defaultValue="Measurements">
                <option>Measurements</option>
                <option>Condition or flaw</option>
                <option>Delivery</option>
                <option>Return eligibility</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="supportMessage">Message</label>
              <textarea id="supportMessage" required rows={5} className="p-3" />
            </div>
            <Button type="submit">Send question</Button>
          </form>
        </section>
      </div>
    </>
  );
}
