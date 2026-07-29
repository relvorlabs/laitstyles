// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), success: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/modules/customers/client/account-hooks", () => ({
  useCreateOwnedAddress: () => ({ mutateAsync: vi.fn() }),
  useUpdateOwnedAddress: () => ({ mutateAsync: mocks.update }),
  useDeleteOwnedAddress: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn() } }));

import { AddressesSection } from "./addresses-section";

const addresses = [
  {
    id: "address-1",
    label: "Home",
    line1: "18 Example Road",
    line2: "",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    isDefault: false,
    deliveryNotes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("AddressesSection", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("persists the selected default before showing success", async () => {
    let resolveMutation: (() => void) | undefined;
    mocks.update.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveMutation = resolve)),
    );
    const user = userEvent.setup();
    render(<AddressesSection initialAddresses={addresses} />);

    await user.click(screen.getByRole("button", { name: "Make default" }));

    expect(mocks.update).toHaveBeenCalledWith({
      addressId: "address-1",
      input: { isDefault: true },
    });
    expect(mocks.success).not.toHaveBeenCalled();
    resolveMutation?.();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Default address updated."));
  });
});
