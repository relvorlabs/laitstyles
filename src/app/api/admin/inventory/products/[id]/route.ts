import { NextResponse } from "next/server";
import { getStaffAccess } from "@/server/auth/session";
import { getInventoryProduct } from "@/server/commerce/inventory/inventory-read";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getStaffAccess("inventory:read");
  if (!access.ok) {
    return NextResponse.json(
      { message: access.reason === "signed-out" ? "Authentication required." : "Forbidden." },
      { status: access.reason === "signed-out" ? 401 : 403 },
    );
  }
  const { id } = await params;
  const product = await getInventoryProduct(id);
  if (!product) {
    return NextResponse.json({ message: "Product not found." }, { status: 404 });
  }
  return NextResponse.json(product, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
