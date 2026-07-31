import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { prisma } from "@/lib/prisma";
import { validateCheckoutCouponSchema } from "@/modules/checkout/coupon-schema";
import { validateCheckoutCoupon } from "@/modules/checkout/server/coupons";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiConsumer();
    const input = await parseJsonBody(request, validateCheckoutCouponSchema);
    const validation = await prisma.$transaction((tx) =>
      validateCheckoutCoupon(tx, input.code, input.subtotalMinor),
    );
    return { data: validation, headers: privateNoStore };
  });
}
