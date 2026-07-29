import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { requestAccountDeletionSchema } from "@/modules/account-lifecycle/schema";
import {
  cancelAccountDeletion,
  getActiveAccountDeletionRequest,
  requestAccountDeletion,
} from "@/modules/account-lifecycle/server/deletion";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    return { data: await getActiveAccountDeletionRequest(identity), headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, requestAccountDeletionSchema);
    return {
      data: await requestAccountDeletion(identity, input),
      status: 201,
      headers: privateNoStore,
    };
  });
}

export async function DELETE(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    return { data: await cancelAccountDeletion(identity), headers: privateNoStore };
  });
}
