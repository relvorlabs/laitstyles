import "server-only";

import { z } from "zod";

const PAYSTACK_TRANSACTION_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize";

const paystackInitializeResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    authorization_url: z.string().url(),
    access_code: z.string().min(1),
    reference: z.string().min(1),
  }),
});

export type PaystackCheckout = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  rawResponse: z.infer<typeof paystackInitializeResponseSchema>;
};

export class PaystackConfigurationError extends Error {
  constructor() {
    super("Paystack is not configured for this environment.");
    this.name = "PaystackConfigurationError";
  }
}

export class PaystackInitializationError extends Error {
  constructor(
    message: string,
    readonly rawResponse: unknown = null,
  ) {
    super(message);
    this.name = "PaystackInitializationError";
  }
}

export type InitializePaystackTransactionInput = {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, string>;
};

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

export async function initializePaystackTransaction(
  input: InitializePaystackTransactionInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<PaystackCheckout> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) throw new PaystackConfigurationError();
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 1) {
    throw new TypeError("Paystack amount must be a positive integer in kobo.");
  }

  let response: Response;
  try {
    response = await fetchImplementation(PAYSTACK_TRANSACTION_INITIALIZE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: String(input.amountKobo),
        currency: "NGN",
        reference: input.reference,
        metadata: JSON.stringify(input.metadata),
      }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new PaystackInitializationError(
      cause instanceof Error ? cause.message : "Paystack could not be reached.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PaystackInitializationError(
      `Paystack returned an unreadable response (${response.status}).`,
    );
  }

  const parsed = paystackInitializeResponseSchema.safeParse(payload);
  if (!response.ok || !parsed.success) {
    const message =
      extractPaystackMessage(payload) ?? `Paystack initialization failed (${response.status}).`;
    throw new PaystackInitializationError(message, payload);
  }

  return {
    authorizationUrl: parsed.data.data.authorization_url,
    accessCode: parsed.data.data.access_code,
    reference: parsed.data.data.reference,
    rawResponse: parsed.data,
  };
}

function extractPaystackMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const message = Reflect.get(payload, "message");
  return typeof message === "string" && message.trim() ? message : null;
}
