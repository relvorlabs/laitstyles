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

function emailFormatError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your new email address.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? undefined : "Enter a valid email address.";
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

// ---- Change email -----------------------------------------------------

function ChangeEmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useAccountUi();
  const email = useValidatedValue(emailFormatError);
  const password = useValidatedValue((value) =>
    requiredError(value, "Enter your current password."),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    email.touch();
    password.touch();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    toast("Email change started");
    onClose();
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      eyebrow="Protected change"
      eyebrowTone="oxblood"
      title="Change email."
      size="xl"
    >
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <LabeledField
          label="New email address"
          htmlFor="change-email-new-email"
          error={email.error}
          success={email.isValid ? "Looks good." : null}
        >
          <Input
            id="change-email-new-email"
            aria-invalid={Boolean(email.error)}
            isValid={email.isValid}
            inputSize="lg"
            name="newEmail"
            onBlur={email.touch}
            onChange={email.onChange}
            required
            type="email"
            value={email.value}
          />
        </LabeledField>
        <LabeledField
          label="Current password"
          htmlFor="change-email-current-password"
          hint="Recent reauthentication may replace this field."
          error={password.error}
          success={password.isValid ? "Entered." : null}
        >
          <Input
            id="change-email-current-password"
            aria-invalid={Boolean(password.error)}
            isValid={password.isValid}
            inputSize="lg"
            name="currentPassword"
            onBlur={password.touch}
            onChange={password.onChange}
            required
            type="password"
            value={password.value}
          />
        </LabeledField>
        <div className={cn(softClass, "p-4 text-sm text-[var(--acc-muted)]")}>
          The current address remains active until the new address is verified.
        </div>
        <Footer>
          <AcctButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton type="submit">Continue</AcctButton>
        </Footer>
      </form>
    </AccountModal>
  );
}

// ---- Change password -------------------------------------------------

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useAccountUi();
  const currentPassword = useValidatedValue((value) =>
    requiredError(value, "Enter your current password."),
  );
  const newPassword = useValidatedValue((value) => {
    const required = requiredError(value, "Enter a new password.");
    if (required) return required;
    return value.length < 8 ? "Use at least 8 characters." : undefined;
  });
  const confirmPassword = useValidatedValue((value) => {
    const required = requiredError(value, "Confirm your new password.");
    if (required) return required;
    return value === newPassword.value ? undefined : "Passwords do not match.";
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    currentPassword.touch();
    newPassword.touch();
    confirmPassword.touch();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    toast("Password changed");
    onClose();
  }

  return (
    <AccountModal
      open={open}
      onClose={onClose}
      eyebrow="Protected change"
      eyebrowTone="oxblood"
      title="Change password."
      size="xl"
    >
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <LabeledField
          label="Current password"
          htmlFor="change-password-current"
          error={currentPassword.error}
          success={currentPassword.isValid ? "Entered." : null}
        >
          <Input
            id="change-password-current"
            aria-invalid={Boolean(currentPassword.error)}
            isValid={currentPassword.isValid}
            inputSize="lg"
            name="currentPassword"
            onBlur={currentPassword.touch}
            onChange={currentPassword.onChange}
            required
            type="password"
            value={currentPassword.value}
          />
        </LabeledField>
        <LabeledField
          label="New password"
          htmlFor="change-password-new"
          error={newPassword.error}
          success={newPassword.isValid ? "Strong enough." : null}
        >
          <Input
            id="change-password-new"
            aria-invalid={Boolean(newPassword.error)}
            isValid={newPassword.isValid}
            inputSize="lg"
            name="newPassword"
            onBlur={newPassword.touch}
            onChange={newPassword.onChange}
            required
            type="password"
            value={newPassword.value}
          />
        </LabeledField>
        <LabeledField
          label="Confirm new password"
          htmlFor="change-password-confirm"
          error={confirmPassword.error}
          success={confirmPassword.isValid ? "Passwords match." : null}
        >
          <Input
            id="change-password-confirm"
            aria-invalid={Boolean(confirmPassword.error)}
            isValid={confirmPassword.isValid}
            inputSize="lg"
            name="confirmPassword"
            onBlur={confirmPassword.touch}
            onChange={confirmPassword.onChange}
            required
            type="password"
            value={confirmPassword.value}
          />
        </LabeledField>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-[var(--acc-ink)]" />
          <span>Sign out all other sessions</span>
        </label>
        <Footer>
          <AcctButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton type="submit">Change password</AcctButton>
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

      {/* Change email */}
      <ChangeEmailModal open={modal === "email"} onClose={onClose} />

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

      {/* Change password */}
      <ChangePasswordModal open={modal === "password"} onClose={onClose} />

      {/* Revoke session (confirm) */}
      <AccountModal
        open={modal === "revoke"}
        onClose={onClose}
        title="Revoke this session?"
        showClose={false}
        size="lg"
      >
        <p className="mt-4 leading-7 text-[var(--acc-muted)]">
          Safari on iPhone will need to sign in again.
        </p>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Keep session
          </AcctButton>
          <AcctButton variant="danger" onClick={success("Session revoked")}>
            Revoke
          </AcctButton>
        </Footer>
      </AccountModal>

      {/* Sign out others (confirm) */}
      <AccountModal
        open={modal === "signout-all"}
        onClose={onClose}
        title="Sign out other sessions?"
        showClose={false}
        size="lg"
      >
        <p className="mt-4 leading-7 text-[var(--acc-muted)]">
          Other devices will need to sign in again. This browser remains active.
        </p>
        <Footer>
          <AcctButton variant="secondary" onClick={onClose}>
            Cancel
          </AcctButton>
          <AcctButton variant="danger" onClick={success("Other sessions signed out")}>
            Sign out others
          </AcctButton>
        </Footer>
      </AccountModal>

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
          navigate("returns");
          onClose();
        }}
      />
    </>
  );
}
