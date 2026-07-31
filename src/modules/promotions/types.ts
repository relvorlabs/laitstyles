export type PromotionDiscountKind = "percent" | "fixed";

export type PromotionCoupon = {
  code: string;
  enabled: boolean;
  kind: PromotionDiscountKind;
  value: number;
  minimumSubtotalMinor: number | null;
  maximumDiscountMinor: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
};

export type PromotionCouponList = {
  coupons: PromotionCoupon[];
};

export type CreatePromotionCouponInput = {
  code?: string;
  prefix?: string;
  enabled: boolean;
  kind: PromotionDiscountKind;
  value: number;
  minimumSubtotalMinor?: number;
  maximumDiscountMinor?: number;
  startsAt?: string;
  expiresAt?: string;
  usageLimit?: number;
};

export type UpdatePromotionCouponInput = CreatePromotionCouponInput & {
  currentCode: string;
};

export type PromotionCouponMutationResult = {
  coupon: PromotionCoupon;
  message: string;
};
