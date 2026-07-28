"use client";

import { type FormEvent, type MouseEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  showStorefrontToast,
  useStorefrontCatalogueData,
  useStorefrontOverlay,
} from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose } from "@/modules/storefront-shell/ui/storefront-icons";

const supportTopics = ["Measurements", "Condition or flaw", "Delivery", "Return eligibility"];

export function InformationOverlays() {
  const overlay = useStorefrontOverlay();
  const { measurementsCm } = useStorefrontCatalogueData();
  const [measureUnit, setMeasureUnit] = useState<"cm" | "in">("cm");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [deliveryValid, setDeliveryValid] = useState<boolean | null>(null);
  const [supportTopic, setSupportTopic] = useState(supportTopics[0]);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportTouched, setSupportTouched] = useState(false);
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };
  const onDeliverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const area = deliveryArea.trim();
    const valid = area.length >= 3;
    setDeliveryValid(valid);
    setDeliveryStatus(
      valid
        ? `Estimated delivery to ${area}: 2–5 business days. Final fee is confirmed at checkout.`
        : "Enter a valid state or delivery area.",
    );
  };
  const supportMessageError =
    supportTouched && supportMessage.trim().length < 10
      ? "Add a little more detail (at least 10 characters)."
      : undefined;
  const onSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupportTouched(true);
    if (supportMessage.trim().length < 10) return;
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
          <form className="mt-5" id="deliveryForm" noValidate onSubmit={onDeliverySubmit}>
            <Field data-invalid={deliveryValid === false}>
              <FieldLabel htmlFor="deliveryArea">State or delivery area</FieldLabel>
              <Input
                aria-invalid={deliveryValid === false}
                id="deliveryArea"
                inputSize="lg"
                isValid={deliveryValid === true}
                name="area"
                onChange={(event) => {
                  setDeliveryArea(event.target.value);
                  setDeliveryValid(null);
                }}
                placeholder="e.g. Lagos"
                required
                value={deliveryArea}
              />
              {deliveryValid === false ? <FieldError>{deliveryStatus}</FieldError> : null}
              {deliveryValid === true ? <FieldSuccess>{deliveryStatus}</FieldSuccess> : null}
            </Field>
            <Button className="mt-3" type="submit">
              Check estimate
            </Button>
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
          <form
            className="mt-5 grid gap-[14px]"
            id="supportForm"
            noValidate
            onSubmit={onSupportSubmit}
          >
            <Field>
              <FieldLabel>Topic</FieldLabel>
              <Select
                onValueChange={(value) => value && setSupportTopic(value)}
                value={supportTopic}
              >
                <SelectTrigger aria-label="Topic" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {supportTopics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={Boolean(supportMessageError)}>
              <FieldLabel htmlFor="supportMessage">Message</FieldLabel>
              <Textarea
                aria-invalid={Boolean(supportMessageError)}
                id="supportMessage"
                isValid={supportTouched && !supportMessageError}
                onBlur={() => setSupportTouched(true)}
                onChange={(event) => setSupportMessage(event.target.value)}
                required
                textareaSize="lg"
                value={supportMessage}
              />
              {supportMessageError ? <FieldError>{supportMessageError}</FieldError> : null}
              {supportTouched && !supportMessageError ? (
                <FieldSuccess>Looks good.</FieldSuccess>
              ) : null}
            </Field>
            <Button type="submit">Send question</Button>
          </form>
        </section>
      </div>
    </>
  );
}
