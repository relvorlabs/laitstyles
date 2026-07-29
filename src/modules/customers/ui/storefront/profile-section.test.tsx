// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn(), success: vi.fn(), error: vi.fn() }));

vi.mock("@/modules/customers/client/account-hooks", () => ({
  useUpdateOwnedProfile: () => ({ mutateAsync: mocks.mutateAsync }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

import { ProfileSection } from "./profile-section";

describe("ProfileSection", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("shows pending state and confirms success only after the API resolves", async () => {
    let resolveMutation: (() => void) | undefined;
    mocks.mutateAsync.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveMutation = resolve)),
    );
    const user = userEvent.setup();
    render(
      <ProfileSection
        email="ada@example.com"
        firstName="Ada"
        lastName="Okafor"
        phone=""
        preferredName=""
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("button", { name: "Saving..." })).toMatchObject({ disabled: true });
    expect(mocks.success).not.toHaveBeenCalled();
    resolveMutation?.();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Profile updated."));
  });
});
