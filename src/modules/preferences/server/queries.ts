import "server-only";

import { prisma } from "@/lib/prisma";
import { applyPreferenceDefaults } from "@/modules/preferences/server/policy";
import type { CustomerIdentity, CustomerPreferences } from "@/modules/preferences/types";

export async function getCustomerPreferences(
  identity: CustomerIdentity,
): Promise<CustomerPreferences> {
  const row = await prisma.customer_preferences.findUnique({
    where: { customer_id: identity.customerId },
  });
  return applyPreferenceDefaults(row);
}
