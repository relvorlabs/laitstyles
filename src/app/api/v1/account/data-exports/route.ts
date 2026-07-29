import { z } from "zod";
import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  listAccountExports,
  requestAccountExport,
} from "@/modules/account-lifecycle/server/exports";

const emptyBodySchema = z.object({}).strict();
const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    return { data: await listAccountExports(identity), headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    await parseJsonBody(request, emptyBodySchema);
    return { data: await requestAccountExport(identity), status: 201, headers: privateNoStore };
  });
}
