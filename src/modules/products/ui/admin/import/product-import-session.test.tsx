/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { ProductImportSessionState } from "@/modules/products/import/types";
import { ProductImportSession } from "@/modules/products/ui/admin/import/product-import-session";

const firstValues = { ...createEmptyProductEditorValues("stocked"), name: "First import" };
const secondValues = { ...createEmptyProductEditorValues("unique"), name: "Second import" };

const initialState: ProductImportSessionState = {
  source: "json",
  ignoredAssetCount: 2,
  selectedImportId: "child-1",
  children: [
    { importId: "child-1", values: firstValues, issues: [], status: "ready" },
    { importId: "child-2", values: secondValues, issues: [], status: "ready" },
  ],
};

describe("ProductImportSession", () => {
  it("keeps each imported product's editor values while switching queue items", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Dialog open>
          <DialogContent>
            <ProductImportSession initialState={initialState} onRequestClose={vi.fn()} />
          </DialogContent>
        </Dialog>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /second import/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "Edited second import" },
    });
    fireEvent.click(screen.getByRole("button", { name: /first import/i }));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByLabelText("Product name") as HTMLInputElement).value).toBe("First import");
    fireEvent.click(screen.getByRole("button", { name: /edited second import/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByLabelText("Product name") as HTMLInputElement).value).toBe(
      "Edited second import",
    );
  });
});
