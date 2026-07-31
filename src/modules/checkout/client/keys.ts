export const checkoutKeys = {
  all: ["storefront", "checkout"] as const,
  context: () => [...checkoutKeys.all, "context"] as const,
  coupons: () => [...checkoutKeys.all, "coupon"] as const,
  coupon: (code: string, subtotalMinor: number) =>
    [...checkoutKeys.coupons(), code.trim().toUpperCase(), subtotalMinor] as const,
  details: () => [...checkoutKeys.all, "detail"] as const,
  detail: (checkoutId: string) => [...checkoutKeys.details(), checkoutId.trim()] as const,
  payments: () => [...checkoutKeys.all, "payment"] as const,
  payment: (paymentId: string) => [...checkoutKeys.payments(), paymentId.trim()] as const,
};
