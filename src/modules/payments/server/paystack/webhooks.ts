import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { PaystackConfigurationError } from "@/modules/payments/server/paystack/client";

export class PaystackWebhookSignatureError extends Error {
  constructor() {
    super("Paystack webhook signature is invalid.");
    this.name = "PaystackWebhookSignatureError";
  }
}

export function verifyWebhookSignature(rawBody: string | Uint8Array, signature: string): void {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) throw new PaystackConfigurationError();

  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  const hasValidFormat = /^[a-f\d]{128}$/i.test(signature);
  const received = hasValidFormat ? Buffer.from(signature, "hex") : Buffer.alloc(expected.length);
  const matches = timingSafeEqual(expected, received);
  if (!hasValidFormat || !matches) throw new PaystackWebhookSignatureError();
}
