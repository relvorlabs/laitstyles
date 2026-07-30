import "server-only";

import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";

const balanceRowSchema = z.object({
  currency: z.string().trim().length(3),
  balance: z.number().int().safe(),
});

const balanceResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(balanceRowSchema),
});

export type PaystackBalance = {
  currency: string;
  availableMinor: number;
};

export async function fetchBalance(fetchImplementation?: typeof fetch): Promise<PaystackBalance[]> {
  const response = await paystackRequest({
    operation: "fetch-balance",
    path: "/balance",
    schema: balanceResponseSchema,
    fetchImplementation,
  });

  return response.data.map((row) => ({
    currency: row.currency.toUpperCase(),
    availableMinor: row.balance,
  }));
}
