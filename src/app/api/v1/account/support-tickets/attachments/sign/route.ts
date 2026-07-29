import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { issueSupportAttachmentUpload } from "@/modules/support/server/uploads";

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const session = await requireApiConsumer();
    return {
      data: issueSupportAttachmentUpload({
        customerId: session.customerId,
        authUserId: session.authUserId,
      }),
    };
  });
}
