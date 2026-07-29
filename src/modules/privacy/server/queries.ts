import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  latestConsentState,
} from "@/modules/privacy/server/policy";
import type { CustomerIdentity, PrivacyPreferences } from "@/modules/privacy/types";

export async function getPrivacyPreferences(
  identity: CustomerIdentity,
): Promise<PrivacyPreferences> {
  const rows = await prisma.privacy_consents.findMany({
    where: { customer_id: identity.customerId },
    select: { consent_key: true, granted: true, effective_at: true },
  });

  const latest = rows.length
    ? rows.reduce(
        (max, row) => (row.effective_at > max ? row.effective_at : max),
        rows[0].effective_at,
      )
    : null;

  return {
    consents: latestConsentState(rows),
    policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    updatedAt: latest ? latest.toISOString() : null,
  };
}
