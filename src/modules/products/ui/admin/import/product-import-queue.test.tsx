/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { ProductImportChild } from "@/modules/products/import/types";
import { ProductImportQueue } from "@/modules/products/ui/admin/import/product-import-queue";

const child: ProductImportChild = {
  importId: "child-1",
  values: { ...createEmptyProductEditorValues("stocked"), name: "First import" },
  issues: [],
  status: "ready",
  isDirty: false,
  persistence: null,
};

describe("ProductImportQueue", () => {
  it("exposes per-product selection and delete controls in the compact queue", () => {
    render(
      <ProductImportQueue
        ignoredAssetCount={0}
        items={[child]}
        onSelect={vi.fn()}
        selectedImportId={child.importId}
        selectedImportIds={[]}
        onAddFile={vi.fn()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("checkbox", { name: "Select First import" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete First import" })).toHaveLength(1);
  });

  it("announces append and ignored-media notices", () => {
    render(
      <ProductImportQueue
        ignoredAssetCount={2}
        items={[child]}
        onSelect={vi.fn()}
        selectedImportId={child.importId}
        selectedImportIds={[]}
        onAddFile={vi.fn()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
        onDelete={vi.fn()}
        appendNotice="1 product appended."
      />,
    );

    expect(screen.getAllByText("1 product appended.")[0]).toHaveAttribute("aria-live", "polite");
    expect(screen.getAllByText(/2 media assets were ignored/)[0]).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
