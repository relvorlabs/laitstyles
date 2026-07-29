import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { replyToTicketSchema, supportTicketIdentifierSchema } from "@/modules/support/schema";
import { replyToTicket } from "@/modules/support/server/commands";

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const ticketId = supportTicketIdentifierSchema.parse((await params).ticketId);
    const input = await parseJsonBody(request, replyToTicketSchema);
    const data = await replyToTicket(identity, ticketId, input);
    return { data, status: 201, headers: { "Cache-Control": "private, no-store" } };
  });
}
