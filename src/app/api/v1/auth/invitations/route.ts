import { NextResponse } from "next/server";
import { inviteStoreManager } from "@/modules/auth/server/staff-invitations";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Enter the manager invitation details." },
      { status: 400 },
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { ok: false, message: "Enter the manager invitation details." },
      { status: 400 },
    );
  }

  try {
    const record = payload as Record<string, unknown>;
    const result = await inviteStoreManager({
      email: typeof record.email === "string" ? record.email : "",
      firstName: typeof record.firstName === "string" ? record.firstName : "",
      lastName: typeof record.lastName === "string" ? record.lastName : "",
    });
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  } catch (error) {
    const forbidden = error instanceof Error && /Only the store owner/.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        message: forbidden
          ? "Only the store owner can invite store managers."
          : "The invitation service is unavailable. Please try again.",
      },
      { status: forbidden ? 403 : 503 },
    );
  }
}
