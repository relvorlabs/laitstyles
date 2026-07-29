import { z } from "zod";

export const privacyConsentKeySchema = z.enum([
  "analytics",
  "personalization",
  "marketing_email",
  "marketing_sms",
]);

export const updatePrivacyPreferencesSchema = z
  .object({
    analytics: z.boolean().optional(),
    personalization: z.boolean().optional(),
    marketing_email: z.boolean().optional(),
    marketing_sms: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one consent value to update.",
  });
