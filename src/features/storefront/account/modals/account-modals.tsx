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
 * Compatibility host for the remaining account-shell modal. Payment-method
 * setup and removal are owned by modules/payments/ui/storefront.
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
    <AccountModal
      open={modal === "verify-email"}
      onClose={onClose}
      eyebrow="Verification"
      title="Verify your email."
      size="lg"
    >
      <p className="mt-5 leading-7 text-[var(--acc-muted)]">
        The authentication provider controls verification-link expiry and resend limits.
      </p>
      <Footer>
        <AcctButton variant="secondary" onClick={onClose}>
          Not now
        </AcctButton>
        <AcctButton onClick={success("Verification email sent")}>Send link</AcctButton>
      </Footer>
    </AccountModal>
  );
}
