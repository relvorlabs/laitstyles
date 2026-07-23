import { NextResponse } from "next/server";
import {
  analyzeCiFeedback,
  CiFeedbackError,
  ciFeedbackPayloadSchema,
  isCiFeedbackAuthorized,
} from "@/server/ci/ci-feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

function noStoreHeaders() {
  return { "Cache-Control": "private, no-store" };
}

export async function POST(request: Request) {
  const expectedToken = process.env.CI_FEEDBACK_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "CI feedback endpoint is not configured.", code: "not_configured" },
      { status: 503, headers: noStoreHeaders() },
    );
  }
  if (!isCiFeedbackAuthorized(request.headers.get("authorization"), expectedToken)) {
    return NextResponse.json(
      { error: "Unauthorized.", code: "unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload is too large.", code: "payload_too_large" },
      { status: 413, headers: noStoreHeaders() },
    );
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload is too large.", code: "payload_too_large" },
      { status: 413, headers: noStoreHeaders() },
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "invalid_json" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const parsed = ciFeedbackPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Request body does not match the CI feedback schema.",
        code: "invalid_payload",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const result = await analyzeCiFeedback(parsed.data);
    return NextResponse.json(result, { status: 200, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof CiFeedbackError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: noStoreHeaders() },
      );
    }
    return NextResponse.json(
      { error: "Unexpected CI analysis failure.", code: "unexpected_failure" },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
