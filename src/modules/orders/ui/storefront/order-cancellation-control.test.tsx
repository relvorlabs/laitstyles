// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cancel: vi.fn(), success: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/modules/orders/client/hooks", () => ({
  useRequestAccountOrderCancellation: () => ({ mutateAsync: mocks.cancel }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: vi.fn() } }));

import { OrderCancellationControl } from "./order-cancellation-control";

describe("OrderCancellationControl", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("does not announce cancellation before the request resolves", async () => {
    let resolveMutation: (() => void) | undefined;
    mocks.cancel.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveMutation = resolve)),
    );
    const user = userEvent.setup();
    render(<OrderCancellationControl orderNumber="LS-1" />);

    await user.selectOptions(screen.getByLabelText("Cancellation reason"), "Ordered by mistake");
    await user.click(screen.getByRole("button", { name: "Cancel order" }));

    expect(mocks.cancel).toHaveBeenCalledWith({
      orderNumber: "LS-1",
      reason: "Ordered by mistake",
    });
    expect(mocks.success).not.toHaveBeenCalled();
    resolveMutation?.();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Order cancelled."));
  });
});
