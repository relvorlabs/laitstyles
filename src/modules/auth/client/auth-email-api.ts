import { apiRequest } from "@/lib/http/client";
import type { AuthEmailRequestInput } from "@/modules/auth/schema";

export type AuthEmailAccepted = {
  status: "accepted";
  email: string;
};

export async function sendAuthEmailRequest(
  input: AuthEmailRequestInput,
): Promise<AuthEmailAccepted> {
  const response = await apiRequest<AuthEmailAccepted>("/api/v1/auth/email", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}
