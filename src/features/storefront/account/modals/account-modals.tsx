"use client";

import type { ReactNode } from "react";
import type { AccountModalId } from "../account-context";
import { useAccountUi } from "../account-context";
import { AcctButton } from "../components/account-primitives";
import { AccountModal } from "./account-modal";

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>
  );
}

/**
 * Compatibility host for account-shell modals that have not moved into a
 * domain module yet. Credential, MFA, and session controls are deliberately
 * absent: `AccountSecurityModals` owns those real Supabase-backed workflows.
 */
export function AccountModals({
  modal,
  onClose,
}: {
  modal: AccountModalId | null;
  onClose: () => void;
}) {
  const { toast } = useAccountUi();

  function success(message: string) {
    return () => {
      toast(message);
      onClose();
    };
  }

  return (
    <>
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
    </>
  );
}
