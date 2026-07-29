// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { savedItemsStore } from "@/stores/saved-items.store";

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }));
vi.mock("@/modules/customers/client/account-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/customers/client/account-api")>()),
  listSavedProductIdsRequest: mocks.list,
  saveProductRequest: mocks.save,
}));

import { useReconcileSavedProductsOnAuth } from "./account-hooks";

function Reconciler() {
  useReconcileSavedProductsOnAuth(true);
  return null;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

describe("saved product reconciliation", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    savedItemsStore.getState().reset();
  });

  it("persists guest-saved products and hydrates the union after sign-in", async () => {
    savedItemsStore.getState().hydrate(["guest-product"]);
    mocks.list.mockResolvedValue(["server-product"]);
    mocks.save.mockResolvedValue(undefined);

    render(<Reconciler />, { wrapper });

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("guest-product"));
    await waitFor(() =>
      expect(savedItemsStore.getState().ids).toEqual(["guest-product", "server-product"]),
    );
  });
});
