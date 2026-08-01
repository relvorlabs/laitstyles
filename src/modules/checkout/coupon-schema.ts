import { z } from "zod";

export const validateCheckoutCouponSchema = z.object({
  code: z.string().trim().min(2).max(48),
  subtotalMinor: z.number().int().nonnegative().safe(),
});

export const configuredCheckoutCouponSchema = z.object({
  code: z.string().trim().min(2).max(48),
  enabled: z.boolean().default(true),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  minimumSubtotalMinor: z.number().int().nonnegative().optional(),
  maximumDiscountMinor: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().max(100000).optional(),
});

export const checkoutCouponSettingsSchema = z.object({
  coupons: z.array(configuredCheckoutCouponSchema).default([]),
});

export type ConfiguredCheckoutCoupon = z.infer<typeof configuredCheckoutCouponSchema>;
