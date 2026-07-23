import { NextResponse } from "next/server";
import { getStaffAccess } from "@/server/auth/session";
import { listInventoryTaxonomy } from "@/server/commerce/inventory/inventory-read";

export async function GET() {
  const access = await getStaffAccess("inventory:read");
  if (!access.ok) {
    return NextResponse.json(
      { message: access.reason === "signed-out" ? "Authentication required." : "Forbidden." },
      { status: access.reason === "signed-out" ? 401 : 403 },
    );
  }
  return NextResponse.json(await listInventoryTaxonomy(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
