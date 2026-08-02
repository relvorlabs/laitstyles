import { apiRequest } from "@/lib/http/client";
import type {
  CreatePromotionCouponInput,
  PromotionCouponList,
  PromotionCouponMutationResult,
  UpdatePromotionCouponInput,
} from "@/modules/promotions/types";

const COUPONS_URL = "/api/v1/admin/promotions/coupons";

export async function getPromotionCouponsRequest(
  signal?: AbortSignal,
): Promise<PromotionCouponList> {
  const response = await apiRequest<PromotionCouponList>(COUPONS_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function createPromotionCouponRequest(
  input: CreatePromotionCouponInput,
): Promise<PromotionCouponMutationResult> {
  const response = await apiRequest<PromotionCouponMutationResult>(COUPONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updatePromotionCouponRequest(
  input: UpdatePromotionCouponInput,
): Promise<PromotionCouponMutationResult> {
  const response = await apiRequest<PromotionCouponMutationResult>(COUPONS_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}
