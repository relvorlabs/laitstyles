import "server-only";

import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  paystackChallengeResponseSchema,
  paystackDeactivateAuthorizationResponseSchema,
  paystackTransactionResponseSchema,
} from "@/modules/payments/server/paystack/schemas";
import {
  mapPaystackTransaction,
  type PaystackTransaction,
} from "@/modules/payments/server/paystack/transactions";

const chargeAuthorizationInputSchema = z.object({
  authorizationCode: z.string().trim().min(1),
  email: z.string().trim().email(),
  amountMinor: z.number().int().positive().safe(),
  reference: z
    .string()
    .trim()
    .min(1)
    .regex(/^[A-Za-z0-9.=_-]+$/),
  currency: z.string().trim().length(3).toUpperCase().default("NGN"),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const chargeAuthorizationResponseSchema = z.union([
  paystackTransactionResponseSchema,
  paystackChallengeResponseSchema,
]);

export type ChargeAuthorizationInput = z.input<typeof chargeAuthorizationInputSchema>;
export type ChargeAuthorizationResult =
  | { kind: "transaction"; transaction: PaystackTransaction }
  | {
      kind: "challenge";
      authorizationUrl: string;
      accessCode: string;
      reference: string;
    };

export async function chargeAuthorization(
  input: ChargeAuthorizationInput,
  fetchImplementation?: typeof fetch,
): Promise<ChargeAuthorizationResult> {
  const parsed = chargeAuthorizationInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "charge-authorization",
    path: "/transaction/charge_authorization",
    method: "POST",
    schema: chargeAuthorizationResponseSchema,
    fetchImplementation,
    body: {
      authorization_code: parsed.authorizationCode,
      email: parsed.email,
      amount: parsed.amountMinor,
      reference: parsed.reference,
      currency: parsed.currency,
      ...(parsed.callbackUrl === undefined ? {} : { callback_url: parsed.callbackUrl }),
      ...(parsed.metadata === undefined ? {} : { metadata: JSON.stringify(parsed.metadata) }),
    },
  });

  if ("paused" in response.data) {
    return {
      kind: "challenge",
      authorizationUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
      reference: response.data.reference,
    };
  }
  return { kind: "transaction", transaction: mapPaystackTransaction(response.data) };
}

export async function deactivateAuthorization(
  authorizationCode: string,
  fetchImplementation?: typeof fetch,
) {
  const parsedCode = z.string().trim().min(1).parse(authorizationCode);
  const response = await paystackRequest({
    operation: "deactivate-authorization",
    path: "/customer/authorization/deactivate",
    method: "POST",
    schema: paystackDeactivateAuthorizationResponseSchema,
    fetchImplementation,
    body: { authorization_code: parsedCode },
  });
  return { deactivated: true as const, message: response.message };
}
