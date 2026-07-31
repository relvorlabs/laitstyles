import { z } from "zod";
import { ApiError } from "@/lib/errors/api-error";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { completeManagerSetup } from "@/modules/auth/server/staff-invitations";

const managerSetupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name.").max(80),
    lastName: z.string().trim().min(1, "Enter your last name.").max(80),
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    confirmPassword: z.string().min(8, "Confirm your password.").max(128),
  })
  .strict();

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const input = await parseJsonBody(request, managerSetupSchema);
    const result = await completeManagerSetup(input);
    if (!result.ok) {
      throw new ApiError({
        code: "MANAGER_SETUP_FAILED",
        message: result.message,
        status: 422,
      });
    }

    return {
      data: { message: result.message },
      headers: privateNoStore,
    };
  });
}
