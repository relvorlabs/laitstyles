import { ApiError } from "@/lib/errors/api-error";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { authEmailRequestSchema } from "@/modules/auth/schema";
import {
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from "@/modules/auth/server/authenticate";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const input = await parseJsonBody(request, authEmailRequestSchema);
    const result =
      input.kind === "recovery"
        ? await sendPasswordResetEmail(input.email, input.returnTo)
        : await sendSignupConfirmationEmail(input.email, input.returnTo);

    if (!result.ok) {
      throw new ApiError({
        code: result.error.code,
        message: result.error.message,
        status: result.error.code === "rate-limited" ? 429 : 422,
      });
    }

    return {
      data: result.value,
      headers: privateNoStore,
    };
  });
}
