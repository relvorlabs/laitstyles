import { ApiError } from "@/lib/errors/api-error";
import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { supportTicketIdentifierSchema } from "@/modules/support/schema";
import { getSupportTicketDetail } from "@/modules/support/server/queries";

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const ticketId = supportTicketIdentifierSchema.parse((await params).ticketId);
    const data = await getSupportTicketDetail(identity, ticketId);
    if (!data) {
      throw new ApiError({
        code: "SUPPORT_TICKET_NOT_FOUND",
        message: "The selected support ticket could not be found.",
        status: 404,
      });
    }
    return { data, headers: { "Cache-Control": "private, no-store" } };
  });
}
