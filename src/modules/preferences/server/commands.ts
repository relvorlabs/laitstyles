import "server-only";

import { prisma } from "@/lib/prisma";
import { applyPreferenceDefaults } from "@/modules/preferences/server/policy";
import type {
  CustomerIdentity,
  CustomerPreferences,
  UpdateCustomerPreferencesInput,
} from "@/modules/preferences/types";

export async function updateCustomerPreferences(
  identity: CustomerIdentity,
  input: UpdateCustomerPreferencesInput,
): Promise<CustomerPreferences> {
  const data = {
    contact_channel: input.contactChannel,
    sizing_unit: input.sizingUnit,
    marketing_opt_in: input.marketingOptIn,
    personalization_enabled: input.personalizationEnabled,
  };

  const row = await prisma.customer_preferences.upsert({
    where: { customer_id: identity.customerId },
    create: { customer_id: identity.customerId, ...data },
    update: data,
  });

  return applyPreferenceDefaults(row);
}
