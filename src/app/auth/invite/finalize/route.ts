import { NextResponse } from "next/server";
import { completeManagerSetup } from "@/modules/auth/server/staff-invitations";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Enter your account setup details." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ ok: false, message: "Enter your account setup details." }, { status: 400 });
  }

  const record = payload as Record<string, unknown>;
  const result = await completeManagerSetup({
    firstName: typeof record.firstName === "string" ? record.firstName : "",
    lastName: typeof record.lastName === "string" ? record.lastName : "",
    password: typeof record.password === "string" ? record.password : "",
    confirmPassword: typeof record.confirmPassword === "string" ? record.confirmPassword : "",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
