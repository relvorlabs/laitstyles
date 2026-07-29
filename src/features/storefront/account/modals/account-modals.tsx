"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

      {/* Return wizard */}
      <ReturnWizardModal open={modal === "return"} onClose={onClose} />
    </>
  );
}
