import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  consentChanges,
  latestConsentState,
} from "@/modules/privacy/server/policy";
import type {
  CustomerIdentity,
  PrivacyPreferences,
  UpdatePrivacyPreferencesInput,
} from "@/modules/privacy/types";

export async function updatePrivacyPreferences(
  identity: CustomerIdentity,
  input: UpdatePrivacyPreferencesInput,
): Promise<PrivacyPreferences> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.privacy_consents.findMany({
      where: { customer_id: identity.customerId },
      select: { consent_key: true, granted: true, effective_at: true },
    });
    const current = latestConsentState(rows);
    const changes = consentChanges(current, input);

    if (changes.length) {
      const effectiveAt = new Date();
      await tx.privacy_consents.createMany({
        data: changes.map((change) => ({
          customer_id: identity.customerId,
          consent_key: change.consentKey,
          granted: change.granted,
          policy_version: CURRENT_PRIVACY_POLICY_VERSION,
          effective_at: effectiveAt,
        })),
      });
    }

    const nextState = { ...current };
    for (const change of changes) nextState[change.consentKey] = change.granted;

    return {
      consents: nextState,
      policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      updatedAt: new Date().toISOString(),
    };
  });
}
