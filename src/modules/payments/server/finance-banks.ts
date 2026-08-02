import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type { FinanceError } from "@/modules/payments/server/finance-types";
import {
  type ListBanksInput,
  listBanks,
  PaystackConfigurationError,
  PaystackProviderError,
} from "@/modules/payments/server/paystack";

export async function listPayoutBanks(
  actor: StaffSession,
  input: ListBanksInput,
): Promise<Result<Awaited<ReturnType<typeof listBanks>>, FinanceError>> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view payout banks." });
  }
  try {
    return ok(await listBanks(input));
  } catch (error: unknown) {
    if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
      return err({
        code: "FINANCE_PROVIDER_UNAVAILABLE",
        message: "Paystack bank data is temporarily unavailable.",
      });
    }
    throw error;
  }
}
