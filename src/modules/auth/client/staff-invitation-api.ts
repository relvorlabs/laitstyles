import { apiRequest } from "@/lib/http/client";
import type { ManagerMember } from "@/modules/auth/types";

export type InviteManagerInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CompleteManagerSetupInput = {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
};

export async function inviteManagerRequest(
  input: InviteManagerInput,
): Promise<{ member: ManagerMember; message: string }> {
  const response = await apiRequest<{ member: ManagerMember; message: string }>(
    "/api/v1/auth/invitations",
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return response.data;
}

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
