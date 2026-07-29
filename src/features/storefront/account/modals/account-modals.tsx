"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
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

export function AccountModals({
  modal,
  onClose,
}: {
  modal: AccountModalId | null;
  onClose: () => void;
}) {
  const { toast } = useAccountUi();

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
    </>
  );
}
