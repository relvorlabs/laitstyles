import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPromotionCouponRequest,
  getPromotionCouponsRequest,
  updatePromotionCouponRequest,
} from "@/modules/promotions/client/api";

export const promotionKeys = {
  all: ["admin", "promotions"] as const,
  coupons: () => [...promotionKeys.all, "coupons"] as const,
};

export function promotionCouponsQueryOptions() {
  return queryOptions({
    queryKey: promotionKeys.coupons(),
    queryFn: ({ signal }) => getPromotionCouponsRequest(signal),
    staleTime: 15_000,
  });
}

export function useCreatePromotionCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPromotionCouponRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: promotionKeys.coupons() });
    },
  });
}

export function useUpdatePromotionCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePromotionCouponRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: promotionKeys.coupons() });
    },
  });
}
