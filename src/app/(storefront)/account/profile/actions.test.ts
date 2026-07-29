import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  updateOwnedProfile: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/auth/server/session", () => ({
  getCurrentSession: mocks.getCurrentSession,
}));
vi.mock("@/modules/customers/server/account-profile", () => ({
  updateOwnedProfile: mocks.updateOwnedProfile,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateAccountProfile } from "./actions";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

function validFormData() {
  const formData = new FormData();
  formData.set("firstName", "Ada");
  formData.set("lastName", "Okafor");
  formData.set("preferredName", "Addie");
  formData.set("phone", "+2348010000000");
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentSession.mockResolvedValue(identity);
  mocks.updateOwnedProfile.mockResolvedValue({
    authUserId: identity.authUserId,
    email: identity.email,
    firstName: "Ada",
    lastName: "Okafor",
    preferredName: "Addie",
    phone: "+2348010000000",
  });
});

describe("updateAccountProfile", () => {
  it("rejects an empty first name before touching the session or domain command", async () => {
    const formData = validFormData();
    formData.set("firstName", "  ");

    const result = await updateAccountProfile({ status: "idle", message: "" }, formData);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.firstName).toBeTruthy();
    expect(mocks.getCurrentSession).not.toHaveBeenCalled();
    expect(mocks.updateOwnedProfile).not.toHaveBeenCalled();
  });

  it("requires a signed-in visitor", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({ kind: "anonymous" });

    const result = await updateAccountProfile({ status: "idle", message: "" }, validFormData());

    expect(result).toEqual({ status: "error", message: "Sign in before updating your profile." });
    expect(mocks.updateOwnedProfile).not.toHaveBeenCalled();
  });

  it("requires a consumer session, not a staff session", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({ kind: "staff", authUserId: "staff-a" });

    const result = await updateAccountProfile({ status: "idle", message: "" }, validFormData());

    expect(result.status).toBe("error");
    expect(mocks.updateOwnedProfile).not.toHaveBeenCalled();
  });

  it("delegates the parsed input to the owned-profile domain command and revalidates", async () => {
    const result = await updateAccountProfile({ status: "idle", message: "" }, validFormData());

    expect(mocks.updateOwnedProfile).toHaveBeenCalledWith(identity, {
      firstName: "Ada",
      lastName: "Okafor",
      preferredName: "Addie",
      phone: "+2348010000000",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/profile");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account");
    expect(result).toEqual({ status: "success", message: "Profile updated." });
  });
});
