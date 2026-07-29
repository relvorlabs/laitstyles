// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AccountModalId,
  AccountUiProvider,
} from "@/features/storefront/account/account-context";
import { AccountModals } from "@/features/storefront/account/modals/account-modals";

afterEach(cleanup);

describe("cumulative account modal ownership", () => {
  it("does not render credential or session workflows from the compatibility host", () => {
    renderAccountModals("email");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Email change started")).toBeNull();
  });

  it("retains the non-security payment-provider boundary", () => {
    renderAccountModals("payment");

    expect(screen.getByRole("dialog", { name: "Add payment method." })).not.toBeNull();
    expect(screen.getByText("Payment-provider hosted fields")).not.toBeNull();
  });
});

function renderAccountModals(modal: AccountModalId) {
  render(
    <AccountUiProvider
      value={{
        currentRoute: "overview",
        navigate: vi.fn(),
        openModal: vi.fn(),
        closeModal: vi.fn(),
        toast: vi.fn(),
      }}
    >
      <AccountModals modal={modal} onClose={vi.fn()} />
    </AccountUiProvider>,
  );
}
