import { ApiError } from "@/lib/errors/api-error";
import { handleApiRequest } from "@/lib/http/server";
import { expireAbandonedCheckouts } from "@/modules/checkout/server/expire-checkouts";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    requireCronSecret(request);
    const result = await expireAbandonedCheckouts();
    return { data: result, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    requireCronSecret(request);
    const result = await expireAbandonedCheckouts();
    return { data: result, headers: privateNoStore };
  });
}

function requireCronSecret(request: Request): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new ApiError({
      code: "CRON_NOT_CONFIGURED",
      message: "CRON_SECRET is not configured for this environment.",
      status: 503,
    });
  }
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (provided !== secret) {
    throw new ApiError({ code: "UNAUTHORIZED", message: "Invalid cron credentials.", status: 401 });
  }
}
