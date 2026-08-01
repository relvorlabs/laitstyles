import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  promotionCouponInputSchema,
  updatePromotionCouponSchema,
} from "@/modules/promotions/schema";
import {
  createPromotionCoupon,
  listPromotionCoupons,
  updatePromotionCoupon,
} from "@/modules/promotions/server/coupons";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("settings:read");
    return { data: await listPromotionCoupons(), headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("settings:update");
    const input = await parseJsonBody(request, promotionCouponInputSchema);
    return { data: await createPromotionCoupon(actor, input), headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("settings:update");
    const input = await parseJsonBody(request, updatePromotionCouponSchema);
    return { data: await updatePromotionCoupon(actor, input), headers: privateNoStore };
  });
}
