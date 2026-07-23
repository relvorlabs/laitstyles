import { NextResponse } from "next/server";
import { getStaffAccess } from "@/server/auth/session";
import { listInventoryStockMovements } from "@/server/commerce/inventory/inventory-read";

export async function GET(request: Request) {
  const access = await getStaffAccess("inventory:read");
  if (!access.ok) {
    return NextResponse.json(
      { message: access.reason === "signed-out" ? "Authentication required." : "Forbidden." },
      { status: access.reason === "signed-out" ? 401 : 403 },
    );
  }
  const productId = new URL(request.url).searchParams.get("productId") ?? undefined;
  return NextResponse.json(await listInventoryStockMovements(productId), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
