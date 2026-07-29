"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { AccountModalId } from "../account-context";
import { useAccountUi } from "../account-context";
import { AcctButton, LabeledField, softClass } from "../components/account-primitives";
import { AccountModal } from "./account-modal";
import { ReturnWizardModal } from "./return-wizard";

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
  );
}

// ---- Lightweight local-state validation for the demo modals ---------------
// These modals stay wired to `demoSubmit`/`success` (native validation, toast,
// close) rather than a real mutation. This hook only adds a visible
// error/success layer on top of that unchanged submission behaviour.

function requiredError(value: string, message: string): string | undefined {
  return value.trim().length === 0 ? message : undefined;
}

function useValidatedValue(validate: (value: string) => string | undefined, initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const error = touched ? validate(value) : undefined;
  const isValid = touched && !error && value.trim().length > 0;

  return {
    value,
    error,
    isValid,
    setValue,
    touch: () => setTouched(true),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(event.target.value),
  } as const;
}

// ---- Add / edit address ------------------------------------------------

const countryOptions = ["Nigeria", "Ghana", "United Kingdom"];

function AddAddressModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useAccountUi();
  const recipientName = useValidatedValue((value) =>
    requiredError(value, "Enter the recipient's name."),
  );
  const addressLine1 = useValidatedValue((value) => requiredError(value, "Enter an address."));
  const city = useValidatedValue((value) => requiredError(value, "Enter a city."));
  const stateRegion = useValidatedValue((value) =>
    requiredError(value, "Enter a state or region."),
  );
  const phone = useValidatedValue((value) => requiredError(value, "Enter a phone number."));
  const [country, setCountry] = useState(countryOptions[0]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    recipientName.touch();
    addressLine1.touch();
    city.touch();
    stateRegion.touch();
    phone.touch();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    toast("Address saved");
    onClose();
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      eyebrow="Delivery and billing"
      title="Add or edit address."
      size="2xl"
      scroll
    >
      <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
        <LabeledField
          label="Recipient name"
          htmlFor="add-address-recipient-name"
          className="sm:col-span-2"
          error={recipientName.error}
          success={recipientName.isValid ? "Looks good." : null}
        >
          <Input
            id="add-address-recipient-name"
            aria-invalid={Boolean(recipientName.error)}
            isValid={recipientName.isValid}
            inputSize="lg"
            name="recipientName"
            onBlur={recipientName.touch}
            onChange={recipientName.onChange}
            required
            value={recipientName.value}
          />
        </LabeledField>
        <LabeledField
          label="Address line 1"
          htmlFor="add-address-line-1"
          className="sm:col-span-2"
          error={addressLine1.error}
          success={addressLine1.isValid ? "Looks good." : null}
        >
          <Input
            id="add-address-line-1"
            aria-invalid={Boolean(addressLine1.error)}
            isValid={addressLine1.isValid}
            inputSize="lg"
            name="addressLine1"
            onBlur={addressLine1.touch}
            onChange={addressLine1.onChange}
            required
            value={addressLine1.value}
          />
        </LabeledField>
        <LabeledField label="Address line 2" htmlFor="add-address-line-2" className="sm:col-span-2">
          <Input id="add-address-line-2" inputSize="lg" name="addressLine2" />
        </LabeledField>
        <LabeledField
          label="City"
          htmlFor="add-address-city"
          error={city.error}
          success={city.isValid ? "Looks good." : null}
        >
          <Input
            id="add-address-city"
            aria-invalid={Boolean(city.error)}
            isValid={city.isValid}
            inputSize="lg"
            name="city"
            onBlur={city.touch}
            onChange={city.onChange}
            required
            value={city.value}
          />
        </LabeledField>
        <LabeledField
          label="State / region"
          htmlFor="add-address-state"
          error={stateRegion.error}
          success={stateRegion.isValid ? "Looks good." : null}
        >
          <Input
            id="add-address-state"
            aria-invalid={Boolean(stateRegion.error)}
            isValid={stateRegion.isValid}
            inputSize="lg"
            name="state"
            onBlur={stateRegion.touch}
            onChange={stateRegion.onChange}
            required
            value={stateRegion.value}
          />
        </LabeledField>
        <LabeledField label="Postal code" htmlFor="add-address-postal-code">
          <Input id="add-address-postal-code" inputSize="lg" name="postalCode" />
        </LabeledField>
        <LabeledField label="Country" htmlFor="add-address-country">
          <Select
            name="country"
            onValueChange={(value) => {
              if (value) setCountry(value);
            }}
            value={country}
          >
            <SelectTrigger id="add-address-country" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {countryOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </LabeledField>
        <LabeledField
          label="Phone"
          htmlFor="add-address-phone"
          className="sm:col-span-2"
          error={phone.error}
          success={phone.isValid ? "Looks good." : null}
        >
          <Input
            id="add-address-phone"
            aria-invalid={Boolean(phone.error)}
            isValid={phone.isValid}
            inputSize="lg"
            name="phone"
            onBlur={phone.touch}
            onChange={phone.onChange}
            required
            type="tel"
            value={phone.value}
          />
        </LabeledField>
        <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
          <input type="checkbox" className="size-5 accent-[var(--acc-ink)]" />
          <span>Set as default shipping address</span>
        </label>
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--acc-line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <AcctButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton type="submit">Save address</AcctButton>
        </div>
      </form>
    </AccountModal>
  );
}

// ---- Cancel item ---------------------------------------------------------

const cancelReasons = ["Ordered by mistake", "Need to change delivery details", "Other"] as const;

function CancelItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useAccountUi();
  const reason = useValidatedValue((value) => requiredError(value, "Choose a reason."));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reason.touch();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    toast("Cancellation request submitted");
    onClose();
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      eyebrow="Eligibility rechecked on submit"
      eyebrowTone="oxblood"
      title="Cancel this item?"
      showClose={false}
      size="xl"
    >
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className={cn(softClass, "p-4")}>
          <p className="font-semibold">Broken-in Leather Moto</p>
          <p className="mt-1 text-sm text-[var(--acc-muted)]">Order #LS-1048 · ₦41,000</p>
        </div>
        <LabeledField
          label="Reason"
          htmlFor="cancel-item-reason"
          error={reason.error}
          success={reason.isValid ? "Reason recorded." : null}
        >
          <Select
            name="reason"
            onValueChange={(value) => {
              if (value) {
                reason.setValue(value);
                reason.touch();
              }
            }}
            value={reason.value}
          >
            <SelectTrigger
              id="cancel-item-reason"
              aria-invalid={Boolean(reason.error)}
              className="h-11 w-full"
            >
              <span className="flex-1 truncate text-left">{reason.value || "Choose a reason"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {cancelReasons.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </LabeledField>
        <p className="text-sm leading-6 text-[var(--acc-muted)]">
          Refund timing and method must come from the payment backend.
        </p>
        <Footer>
          <AcctButton variant="secondary" type="button" onClick={onClose}>
            Keep item
          </AcctButton>
          <AcctButton variant="danger" type="submit">
            Request cancellation
          </AcctButton>
        </Footer>
      </form>
    </AccountModal>
  );
}

// ---- Support request -------------------------------------------------

const supportTopics = [
  "Order question",
  "Return or refund",
  "Product information",
  "Account and security",
] as const;

const supportRelatedItems = ["None", "Order #LS-1048", "Return #RT-0038"] as const;

function SupportRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useAccountUi();
  const [topic, setTopic] = useState<string>(supportTopics[0]);
  const [relatedItem, setRelatedItem] = useState<string>(supportRelatedItems[0]);
  const subject = useValidatedValue((value) => requiredError(value, "Enter a subject."));
  const message = useValidatedValue((value) => requiredError(value, "Enter a message."));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    subject.touch();
    message.touch();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    toast("Support request created");
    onClose();
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      eyebrow="New support request"
      title="How can support help?"
      size="2xl"
      scroll
    >
      <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
        <LabeledField label="Topic" htmlFor="support-request-topic">
          <Select
            name="topic"
            onValueChange={(value) => {
              if (value) setTopic(value);
            }}
            value={topic}
          >
            <SelectTrigger id="support-request-topic" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {supportTopics.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </LabeledField>
        <LabeledField label="Related order or return" htmlFor="support-request-related">
          <Select
            name="relatedItem"
            onValueChange={(value) => {
              if (value) setRelatedItem(value);
            }}
            value={relatedItem}
          >
            <SelectTrigger id="support-request-related" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {supportRelatedItems.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </LabeledField>
        <LabeledField
          label="Subject"
          htmlFor="support-request-subject"
          error={subject.error}
          success={subject.isValid ? "Looks good." : null}
        >
          <Input
            id="support-request-subject"
            aria-invalid={Boolean(subject.error)}
            isValid={subject.isValid}
            inputSize="lg"
            name="subject"
            onBlur={subject.touch}
            onChange={subject.onChange}
            required
            value={subject.value}
          />
        </LabeledField>
        <LabeledField
          label="Message"
          htmlFor="support-request-message"
          error={message.error}
          success={message.isValid ? "Looks good." : null}
        >
          <Textarea
            id="support-request-message"
            aria-invalid={Boolean(message.error)}
            isValid={message.isValid}
            name="message"
            onBlur={message.touch}
            onChange={message.onChange}
            required
            textareaSize="lg"
            value={message.value}
          />
        </LabeledField>
        <Button
          type="button"
          onClick={() => toast("Attachment picker opened with validation.")}
          className="text-left"
          variant="ghost"
        >
          <strong>Attach files</strong>
          <span className="mt-2 block text-sm text-[var(--acc-muted)]">
            Only supported file types and sizes.
          </span>
        </Button>
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--acc-line)] pt-5 sm:flex-row sm:justify-end">
          <AcctButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton type="submit">Submit request</AcctButton>
        </div>
      </form>
    </AccountModal>
  );
}

// ---- Account deletion (high-risk) -------------------------------------

function DeleteAccountModal({
  open,
  onClose,
  onViewOrder,
  onViewReturn,
}: {
  open: boolean;
  onClose: () => void;
  onViewOrder: () => void;
  onViewReturn: () => void;
}) {
  const confirmation = useValidatedValue((value) => {
    if (!value.trim()) return "Type DELETE to confirm.";
    return value === "DELETE" ? undefined : "Type DELETE exactly as shown.";
  });

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      eyebrow="High-risk action"
      eyebrowTone="oxblood"
      title="Review account deletion."
      size="2xl"
      fullMobile
    >
      <div className="mt-6 rounded-[14px] border border-[var(--acc-line)] border-l-[5px] border-l-[var(--acc-oxblood)] bg-[rgba(250,248,242,.88)] p-5">
        <p className="font-mono text-[.69rem] font-semibold uppercase leading-none tracking-[.13em] text-[var(--acc-oxblood)]">
          Currently blocked
        </p>
        <h3 className="mt-3 font-serif text-3xl font-normal">Two commerce tasks remain open.</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[var(--acc-muted)]">
          <li>Order #LS-1048 is still in transit.</li>
          <li>Return #RT-0038 is awaiting shipment.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <AcctButton variant="secondary" onClick={onViewOrder}>
            View order
          </AcctButton>
          <AcctButton variant="secondary" onClick={onViewReturn}>
            View return
          </AcctButton>
        </div>
      </div>

      <section className="mt-7">
        <h3 className="font-serif text-3xl font-normal">When deletion becomes available.</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-[var(--acc-muted)]">
          <li>Profile and preferences may be deleted or anonymized.</li>
          <li>Saved products and active sessions are removed.</li>
          <li>Transaction records may be retained where required.</li>
          <li>Support and refund history follows the real retention policy.</li>
        </ul>
      </section>

      <fieldset
        className="mt-7 rounded-[14px] border border-[var(--acc-line-strong)] p-5 opacity-55"
        disabled
      >
        <legend className="px-2 text-sm font-semibold">Final confirmation</legend>
        <LabeledField
          label="Type DELETE"
          htmlFor="delete-account-confirm"
          error={confirmation.error}
          success={confirmation.isValid ? "Confirmed." : null}
        >
          <Input
            id="delete-account-confirm"
            aria-invalid={Boolean(confirmation.error)}
            inputSize="lg"
            isValid={confirmation.isValid}
            onBlur={confirmation.touch}
            onChange={confirmation.onChange}
            placeholder="DELETE"
            value={confirmation.value}
          />
        </LabeledField>
        <label className="mt-4 flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-5" />
          <span>I understand the deletion and retention consequences.</span>
        </label>
      </fieldset>

      <Footer>
        <AcctButton variant="secondary" onClick={onClose}>
          Close
        </AcctButton>
        <AcctButton variant="danger" disabled>
          Delete account
        </AcctButton>
      </Footer>
    </AccountModal>
  );
}

export function AccountModals({
  modal,
  onClose,
}: {
  modal: AccountModalId | null;
  onClose: () => void;
}) {
  const { toast, navigate } = useAccountUi();

  // `data-success` buttons: toast + close.
  function success(message: string) {
    return () => {
      toast(message);
      onClose();
    };
  }

  return (
    <>
      {/* Verify email */}
      <AccountModal
        open={modal === "verify-email"}
        onClose={onClose}
        eyebrow="Verification"
        title="Verify your email."
        size="lg"
      >
        <p className="mt-5 leading-7 text-[var(--acc-muted)]">
          A verification link will be sent to ada@example.com. The authentication provider controls
          expiry and resend limits.
        </p>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Not now
          </AcctButton>
          <AcctButton onClick={success("Verification email sent")}>Send link</AcctButton>
        </Footer>
      </AccountModal>

      {/* Add / edit address */}
      <AddAddressModal open={modal === "address"} onClose={onClose} />

      {/* Delete address (confirm) */}
      <AccountModal
        open={modal === "delete-address"}
        onClose={onClose}
        title="Delete this address?"
        showClose={false}
        size="lg"
      >
        <p className="mt-4 leading-7 text-[var(--acc-muted)]">
          This does not change an address recorded on an existing order.
        </p>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Keep address
          </AcctButton>
          <AcctButton variant="danger" onClick={success("Address deleted")}>
            Delete
          </AcctButton>
        </Footer>
      </AccountModal>

      {/* Add payment method */}
      <AccountModal
        open={modal === "payment"}
        onClose={onClose}
        eyebrow="Secure provider boundary"
        title="Add payment method."
        size="xl"
      >
        <div className="mt-6 rounded-[14px] border border-dashed border-[var(--acc-line-strong)] bg-[var(--acc-bone-2)] p-6">
          <p className="font-semibold">Payment-provider hosted fields</p>
          <p className="mt-3 leading-7 text-[var(--acc-muted)]">
            Card number, expiry, CVV, setup challenge and provider errors belong inside the provider
            integration.
          </p>
        </div>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton onClick={success("Provider setup completed")}>Continue securely</AcctButton>
        </Footer>
      </AccountModal>

      {/* Remove payment (confirm) */}
      <AccountModal
        open={modal === "remove-payment"}
        onClose={onClose}
        title="Remove Visa ending 4242?"
        showClose={false}
        size="lg"
      >
        <p className="mt-4 leading-7 text-[var(--acc-muted)]">
          A replacement default may be required before removal.
        </p>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Keep method
          </AcctButton>
          <AcctButton variant="danger" onClick={success("Payment method removed")}>
            Remove
          </AcctButton>
        </Footer>
      </AccountModal>

      {/* Cancel item */}
      <CancelItemModal open={modal === "cancel"} onClose={onClose} />

      {/* Data export */}
      <AccountModal
        open={modal === "export"}
        onClose={onClose}
        eyebrow="Asynchronous request"
        title="Export account data."
        size="xl"
      >
        <p className="mt-5 leading-7 text-[var(--acc-muted)]">
          The export may include profile, orders, returns, addresses, preferences and support
          records. Security secrets and payment credentials stay excluded.
        </p>
        <div className={cn(softClass, "mt-6 p-4 text-sm text-[var(--acc-muted)]")}>
          Production states: pending, processing, ready, expired, failed and rate-limited.
        </div>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton onClick={success("Data export requested")}>Request export</AcctButton>
        </Footer>
      </AccountModal>

      {/* Support request */}
      <SupportRequestModal open={modal === "support"} onClose={onClose} />

      {/* Account deletion (high-risk) */}
      <DeleteAccountModal
        open={modal === "delete"}
        onClose={onClose}
        onViewOrder={() => {
          navigate("orders");
          onClose();
        }}
        onViewReturn={() => {
          navigate("return-detail");
          onClose();
        }}
      />

      {/* Return wizard */}
      <ReturnWizardModal open={modal === "return"} onClose={onClose} />
    </>
  );
}
