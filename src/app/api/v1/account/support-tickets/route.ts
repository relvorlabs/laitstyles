import { requireApiConsumer } from "@/lib/http/auth";
import { createPaginationMeta } from "@/lib/http/pagination";
import { parseJsonBody, parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  createSupportTicketSchema,
  supportTicketListSearchSchema,
} from "@/modules/support/schema";
import { createSupportTicket } from "@/modules/support/server/commands";
import { listSupportTickets } from "@/modules/support/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = parseSearchParams(request, supportTicketListSearchSchema);
    const result = await listSupportTickets(identity, input);
    return {
      data: result.data,
      meta: createPaginationMeta({ ...input, total: result.total }),
      headers: privateNoStore,
    };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createSupportTicketSchema);
    const data = await createSupportTicket(identity, input);
    return { data, status: 201, headers: privateNoStore };
  });
}
