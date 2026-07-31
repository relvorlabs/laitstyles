import { apiRequest } from "@/lib/http/client";

export type CompleteManagerSetupInput = {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
};

export async function completeManagerSetupRequest(
  input: CompleteManagerSetupInput,
): Promise<{ message: string }> {
  const response = await apiRequest<{ message: string }>("/api/v1/auth/invitations/finalize", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}
