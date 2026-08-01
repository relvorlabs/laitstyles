"use client";

import { Button } from "@/components/ui/button";
import { requestStorefrontCheckoutResume } from "@/modules/checkout/client/recovery-events";

export function OrderResumePaymentControl() {
  return (
    <Button onClick={() => requestStorefrontCheckoutResume()} size="lg" type="button">
      Continue payment
    </Button>
  );
}
