"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AccountModalId } from "../account-context";
import { useAccountUi } from "../account-context";
import { AcctButton, fieldClass, LabeledField, softClass } from "../components/account-primitives";
import { AccountModal } from "./account-modal";
import { ReturnWizardModal } from "./return-wizard";

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
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

  // `data-demo` forms in the prototype: native-validate, toast, close.
  function demoSubmit(message: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!event.currentTarget.checkValidity()) {
        event.currentTarget.reportValidity();
        return;
      }
      toast(message);
      onClose();
    };
  }

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
      <AccountModal
        open={modal === "email"}
        onClose={onClose}
        eyebrow="Protected change"
        eyebrowTone="oxblood"
        title="Change email."
        size="xl"
      >
        <form className="mt-6 space-y-5" onSubmit={demoSubmit("Email change started")}>
          <LabeledField label="New email address">
            <Input type="email" required className={fieldClass} />
          </LabeledField>
          <LabeledField
            label="Current password"
            hint="Recent reauthentication may replace this field."
          >
            <Input type="password" required className={fieldClass} />
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

      {/* Add / edit address */}
      <AccountModal
        open={modal === "address"}
        onClose={onClose}
        eyebrow="Delivery and billing"
        title="Add or edit address."
        size="2xl"
        scroll
      >
        <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={demoSubmit("Address saved")}>
          <LabeledField label="Recipient name" className="sm:col-span-2">
            <Input required className={fieldClass} />
          </LabeledField>
          <LabeledField label="Address line 1" className="sm:col-span-2">
            <Input required className={fieldClass} />
          </LabeledField>
          <LabeledField label="Address line 2" className="sm:col-span-2">
            <Input className={fieldClass} />
          </LabeledField>
          <LabeledField label="City">
            <Input required className={fieldClass} />
          </LabeledField>
          <LabeledField label="State / region">
            <Input required className={fieldClass} />
          </LabeledField>
          <LabeledField label="Postal code">
            <Input className={fieldClass} />
          </LabeledField>
          <LabeledField label="Country">
            <select className={fieldClass}>
              <option>Nigeria</option>
              <option>Ghana</option>
              <option>United Kingdom</option>
            </select>
          </LabeledField>
          <LabeledField label="Phone" className="sm:col-span-2">
            <Input type="tel" required className={fieldClass} />
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
      <AccountModal
        open={modal === "cancel"}
        onClose={onClose}
        eyebrow="Eligibility rechecked on submit"
        eyebrowTone="oxblood"
        title="Cancel this item?"
        showClose={false}
        size="xl"
      >
        <form className="mt-6 space-y-5" onSubmit={demoSubmit("Cancellation request submitted")}>
          <div className={cn(softClass, "p-4")}>
            <p className="font-semibold">Broken-in Leather Moto</p>
            <p className="mt-1 text-sm text-[var(--acc-muted)]">Order #LS-1048 · ₦41,000</p>
          </div>
          <LabeledField label="Reason">
            <select required className={fieldClass} defaultValue="">
              <option value="">Choose a reason</option>
              <option>Ordered by mistake</option>
              <option>Need to change delivery details</option>
              <option>Other</option>
            </select>
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

      {/* Change password */}
      <AccountModal
        open={modal === "password"}
        onClose={onClose}
        eyebrow="Protected change"
        eyebrowTone="oxblood"
        title="Change password."
        size="xl"
      >
        <form className="mt-6 space-y-5" onSubmit={demoSubmit("Password changed")}>
          <LabeledField label="Current password">
            <Input type="password" required className={fieldClass} />
          </LabeledField>
          <LabeledField label="New password">
            <Input type="password" required className={fieldClass} />
          </LabeledField>
          <LabeledField label="Confirm new password">
            <Input type="password" required className={fieldClass} />
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
      <AccountModal
        open={modal === "support"}
        onClose={onClose}
        eyebrow="New support request"
        title="How can support help?"
        size="2xl"
        scroll
      >
        <form className="mt-6 grid gap-5" onSubmit={demoSubmit("Support request created")}>
          <LabeledField label="Topic">
            <select className={fieldClass}>
              <option>Order question</option>
              <option>Return or refund</option>
              <option>Product information</option>
              <option>Account and security</option>
            </select>
          </LabeledField>
          <LabeledField label="Related order or return">
            <select className={fieldClass}>
              <option>None</option>
              <option>Order #LS-1048</option>
              <option>Return #RT-0038</option>
            </select>
          </LabeledField>
          <LabeledField label="Subject">
            <Input required className={fieldClass} />
          </LabeledField>
          <LabeledField label="Message">
            <Textarea required className={cn(fieldClass, "min-h-32")} />
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

      {/* Account deletion (high-risk) */}
      <AccountModal
        open={modal === "delete"}
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
            <AcctButton
              variant="secondary"
              onClick={() => {
                navigate("orders");
                onClose();
              }}
            >
              View order
            </AcctButton>
            <AcctButton
              variant="secondary"
              onClick={() => {
                navigate("return-detail");
                onClose();
              }}
            >
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
          <label className="block">
            <span className="text-sm font-semibold">Type DELETE</span>
            <Input placeholder="DELETE" className={cn(fieldClass, "mt-2")} />
          </label>
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

      {/* Return wizard */}
      <ReturnWizardModal open={modal === "return"} onClose={onClose} />
    </>
  );
}
