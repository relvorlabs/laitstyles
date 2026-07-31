import { z } from "zod";
import { ApiError } from "@/lib/errors/api-error";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { inviteStoreManager } from "@/modules/auth/server/staff-invitations";

const managerInvitationSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address."),
    firstName: z.string().trim().min(1, "Enter a first name.").max(80),
    lastName: z.string().trim().min(1, "Enter a last name.").max(80),
  })
  .strict();

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const input = await parseJsonBody(request, managerInvitationSchema);

    let result: Awaited<ReturnType<typeof inviteStoreManager>>;
    try {
      result = await inviteStoreManager(input);
    } catch (error: unknown) {
      const ownerOnly = error instanceof Error && /Only the store owner/.test(error.message);
      throw new ApiError({
        code: ownerOnly ? "OWNER_ACCESS_REQUIRED" : "INVITATION_UNAVAILABLE",
        message: ownerOnly
          ? "Only the store owner can invite store managers."
          : "The invitation service is unavailable. Please try again.",
        status: ownerOnly ? 403 : 503,
        cause: error,
      });
    }

    if (!result.ok) {
      throw new ApiError({
        code: "MANAGER_INVITATION_REJECTED",
        message: sanitizeInvitationMessage(result.message),
        status: 422,
        fieldErrors: result.fieldErrors
          ? Object.fromEntries(
              Object.entries(result.fieldErrors).map(([field, message]) => [
                field,
                sanitizeInvitationMessage(message),
              ]),
            )
          : undefined,
      });
    }

    return {
      data: { member: result.member, message: result.message },
      headers: privateNoStore,
      status: 201,
    };
  });
}

function sanitizeInvitationMessage(message: string): string {
  return message.replace(/Supabase(?: Auth)?/gi, "The invitation service");
}
