import { z } from "zod";

const optionalMinorAmount = z.number().int().positive().safe().optional();
const optionalDateTime = z.string().datetime().optional();

const promotionCouponFields = {
  code: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only.")
    .optional(),
  prefix: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only.")
    .optional(),
  enabled: z.boolean(),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().positive().safe(),
  minimumSubtotalMinor: z.number().int().nonnegative().safe().optional(),
  maximumDiscountMinor: optionalMinorAmount,
  startsAt: optionalDateTime,
  expiresAt: optionalDateTime,
  usageLimit: z.number().int().positive().max(100000).optional(),
} as const;

function refineCouponInput(
  input: {
    kind: "percent" | "fixed";
    value: number;
    startsAt?: string;
    expiresAt?: string;
  },
  context: z.RefinementCtx,
): void {
  if (input.kind === "percent" && input.value > 100) {
    context.addIssue({
      code: "custom",
      path: ["value"],
      message: "Percentage discounts cannot exceed 100%.",
    });
  }
  if (
    input.startsAt &&
    input.expiresAt &&
    Date.parse(input.expiresAt) <= Date.parse(input.startsAt)
  ) {
    context.addIssue({
      code: "custom",
      path: ["expiresAt"],
      message: "The end date must be later than the start date.",
    });
  }
}

export const promotionCouponInputSchema = z
  .object(promotionCouponFields)
  .strict()
  .superRefine(refineCouponInput);

export const updatePromotionCouponSchema = z
  .object({
    ...promotionCouponFields,
    currentCode: z.string().trim().min(2).max(48),
  })
  .strict()
  .superRefine(refineCouponInput);
