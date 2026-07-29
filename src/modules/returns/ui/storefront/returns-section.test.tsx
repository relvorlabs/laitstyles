// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), success: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/modules/returns/client/hooks", () => ({
  useCreateAccountReturn: () => ({ mutateAsync: mocks.create }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn() } }));

import { ReturnsSection } from "./returns-section";

const eligible = [
  {
    orderNumber: "LS-1",
    totalKobo: 24_000_00,
    lines: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        productId: "product-1",
        productName: "Silk dress",
        quantity: 1,
        eligibleQuantity: 1,
        unitPriceKobo: 24_000_00,
      },
    ],
  },
];

describe("ReturnsSection", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("shows submission success only after the return API resolves", async () => {
    let resolveMutation: (() => void) | undefined;
    mocks.create.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveMutation = resolve)),
    );
    const user = userEvent.setup();
    render(<ReturnsSection eligibleOrders={eligible} initialReturns={[]} />);

    await user.click(screen.getByRole("button", { name: "Start a return" }));
    await user.type(screen.getByLabelText("Reason for return"), "Wrong fit");
    await user.click(screen.getByRole("button", { name: "Submit return" }));

    expect(mocks.success).not.toHaveBeenCalled();
    resolveMutation?.();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Return request submitted."));
  });
});
