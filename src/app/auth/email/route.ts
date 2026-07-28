import { NextResponse } from "next/server";
import { authEmailRequestSchema, authFieldErrors } from "@/modules/auth/schema";
import {
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from "@/modules/auth/server/authenticate";
import { authFlowFailure } from "@/modules/auth/server/diagnostics";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: authFlowFailure("invalid-input"),
      },
      { status: 400 },
    );
  }

  const parsed = authEmailRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          ...authFlowFailure("invalid-input"),
          fieldErrors: authFieldErrors(parsed.error),
        },
      },
      { status: 400 },
    );
  }

  const result =
    parsed.data.kind === "recovery"
      ? await sendPasswordResetEmail(parsed.data.email, parsed.data.returnTo)
      : await sendSignupConfirmationEmail(parsed.data.email, parsed.data.returnTo);

  return NextResponse.json(result, {
    status: result.ok ? 200 : result.error.code === "rate-limited" ? 429 : 400,
  });
}
