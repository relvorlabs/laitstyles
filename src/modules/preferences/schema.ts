import { z } from "zod";

export const contactChannelSchema = z.enum(["email", "sms", "whatsapp", "none"]);
export const sizingUnitSchema = z.enum(["metric", "imperial"]);

export const updateCustomerPreferencesSchema = z
  .object({
    contactChannel: contactChannelSchema,
    sizingUnit: sizingUnitSchema,
    marketingOptIn: z.boolean(),
    personalizationEnabled: z.boolean(),
  })
  .strict();
