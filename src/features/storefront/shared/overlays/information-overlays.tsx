"use client";

import { type FormEvent, type MouseEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconClose } from "@/features/storefront/shared/storefront-icons";
import {
  showStorefrontToast,
  useStorefrontCatalogueData,
  useStorefrontOverlay,
} from "@/modules/storefront-shell/client/storefront-runtime";

export function InformationOverlays() {
  const overlay = useStorefrontOverlay();
  const { measurementsCm } = useStorefrontCatalogueData();
  const [measureUnit, setMeasureUnit] = useState<"cm" | "in">("cm");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };
  const onDeliverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const area = new FormData(event.currentTarget).get("area")?.toString().trim() ?? "";
    setDeliveryStatus(
      area.length < 3
        ? "Enter a valid state or delivery area."
        : `Estimated delivery to ${area}: 2–5 business days. Final fee is confirmed at checkout.`,
    );
  };
  const onSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    overlay.close();
    showStorefrontToast("Your question has been recorded.");
  };

  return (
    <>
      <div
        aria-label="Condition guide"
        aria-modal="true"
        className={`overlay modal-wrap${overlay.openId === "conditionModal" ? " open" : ""}`}
        id="conditionModal"
        onClick={overlayBackdrop}
        role="dialog"
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Condition guide</h2>
            <Button
              aria-label="Close condition guide"
              onClick={overlay.close}
              size="icon-lg"
              type="button"
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
                Minimal or no visible wear. No stains, structural damage, stretched areas or
                damaged fastenings.
              </p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade A — Excellent</h3>
                <span className="badge">A</span>
              </div>
              <p>
                Very light signs of normal use while remaining highly presentable and ready to
                wear.
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
        aria-label="Measurements and fit"
        aria-modal="true"
        className={`overlay modal-wrap${overlay.openId === "measureModal" ? " open" : ""}`}
        id="measureModal"
        onClick={overlayBackdrop}
        role="dialog"
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Measurements and fit</h2>
            <Button
              aria-label="Close measurements"
              onClick={overlay.close}
              size="icon-lg"
              type="button"
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
                  aria-pressed={measureUnit === "cm"}
                  onClick={() => setMeasureUnit("cm")}
                  type="button"
                  variant="ghost"
                >
                  Centimetres
                </Button>
                <Button
                  aria-pressed={measureUnit === "in"}
                  onClick={() => setMeasureUnit("in")}
                  type="button"
                  variant="ghost"
                >
                  Inches
                </Button>
              </div>
              <dl className="measure-table" id="measureList">
                {Object.entries(measurementsCm).map(([key, value]) => (
                  <div className="measure-row" key={key}>
                    <dt>{key}</dt>
                    <dd className="mono">
                      {measureUnit === "cm" ? `${value} cm` : `${(value / 2.54).toFixed(1)} in`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </div>

      <div
        aria-label="Delivery estimate"
        aria-modal="true"
        className={`overlay modal-wrap${overlay.openId === "deliveryModal" ? " open" : ""}`}
        id="deliveryModal"
        onClick={overlayBackdrop}
        role="dialog"
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Delivery estimate</h2>
            <Button
              aria-label="Close delivery estimate"
              onClick={overlay.close}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <form className="mt-5" id="deliveryForm" onSubmit={onDeliverySubmit}>
            <div className="field">
              <label htmlFor="deliveryArea">State or delivery area</label>
              <input id="deliveryArea" name="area" placeholder="e.g. Lagos" required />
            </div>
            <Button className="mt-3" type="submit">
              Check estimate
            </Button>
            <p aria-live="polite" className="text-[0.8rem]" id="deliveryStatus">
              {deliveryStatus}
            </p>
          </form>
        </section>
      </div>

      <div
        aria-label="Brand labelling"
        aria-modal="true"
        className={`overlay modal-wrap${overlay.openId === "authModal" ? " open" : ""}`}
        id="authModal"
        onClick={overlayBackdrop}
        role="dialog"
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Brand labelling</h2>
            <Button
              aria-label="Close brand labelling"
              onClick={overlay.close}
              size="icon-lg"
              type="button"
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
        aria-label="Ask about a product"
        aria-modal="true"
        className={`overlay modal-wrap${overlay.openId === "supportModal" ? " open" : ""}`}
        id="supportModal"
        onClick={overlayBackdrop}
        role="dialog"
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Ask about a product</h2>
            <Button
              aria-label="Close support form"
              onClick={overlay.close}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <form className="mt-5 grid gap-[14px]" id="supportForm" onSubmit={onSupportSubmit}>
            <div className="field">
              <label htmlFor="supportTopic">Topic</label>
              <select defaultValue="Measurements" id="supportTopic">
                <option>Measurements</option>
                <option>Condition or flaw</option>
                <option>Delivery</option>
                <option>Return eligibility</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="supportMessage">Message</label>
              <textarea className="p-3" id="supportMessage" required rows={5} />
            </div>
            <Button type="submit">Send question</Button>
          </form>
        </section>
      </div>
    </>
  );
}
