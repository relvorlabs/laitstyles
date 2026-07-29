import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { completeSupportAttachmentSchema } from "@/modules/support/schema";
import { completeSupportAttachmentUpload } from "@/modules/support/server/uploads";

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const session = await requireApiConsumer();
    const input = await parseJsonBody(request, completeSupportAttachmentSchema);
    return {
      data: await completeSupportAttachmentUpload(
        { customerId: session.customerId, authUserId: session.authUserId },
        input,
      ),
    };
  });
}
