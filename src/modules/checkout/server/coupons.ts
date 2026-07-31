import "server-only";

import type { Prisma } from "@/lib/prisma";
import { checkoutCouponSettingsSchema } from "@/modules/checkout/coupon-schema";
import type { CheckoutCouponValidation } from "@/modules/checkout/types";

export async function validateCheckoutCoupon(
  tx: Prisma.TransactionClient,
  code: string,
  subtotalMinor: number,
): Promise<CheckoutCouponValidation> {
  const normalizedCode = normalizeCouponCode(code);
  const settings = await tx.store_settings.findUnique({
    where: { id: 1 },
    select: { selling: true },
  });
  const parsed = checkoutCouponSettingsSchema.safeParse(settings?.selling ?? {});
  const coupons = parsed.success ? parsed.data.coupons : [];
  const coupon = coupons.find((candidate) => normalizeCouponCode(candidate.code) === normalizedCode);

  if (!coupon || !coupon.enabled) {
    return invalid(normalizedCode, "This coupon code is not active.");
  }

  const now = Date.now();
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now) {
    return invalid(normalizedCode, "This coupon is not active yet.");
  }
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= now) {
    return invalid(normalizedCode, "This coupon has expired.");
  }
  if (subtotalMinor < (coupon.minimumSubtotalMinor ?? 0)) {
    return invalid(normalizedCode, "Your bag has not reached this coupon’s minimum spend.");
  }

  const rawDiscount =
    coupon.kind === "percent"
      ? Math.floor((subtotalMinor * Math.min(coupon.value, 100)) / 100)
      : Math.floor(coupon.value);
  const cappedDiscount = Math.min(
    rawDiscount,
    coupon.maximumDiscountMinor ?? rawDiscount,
    subtotalMinor,
  );

  if (cappedDiscount <= 0) {
    return invalid(normalizedCode, "This coupon does not apply to the current bag.");
  }

  return {
    code: normalizedCode,
    valid: true,
    message: `${normalizedCode} applied.`,
    discountMinor: cappedDiscount,
  };
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toLocaleUpperCase("en-NG");
}

function invalid(code: string, message: string): CheckoutCouponValidation {
  return { code, valid: false, message, discountMinor: 0 };
}
