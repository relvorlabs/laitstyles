/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { ProductImportSessionState } from "@/modules/products/import/types";
import type { ProductEditorValues } from "@/modules/products/types";
import { ProductImportSession } from "@/modules/products/ui/admin/import/product-import-session";

vi.mock("@/modules/products/ui/admin/product-editor/product-editor-dialog", async () => {
  const { useState } = await import("react");
  return {
    ProductEditorSurface: ({
      initialValues,
      onValuesChange,
      queueNavigation,
    }: {
      initialValues: ProductEditorValues;
      onValuesChange: (values: ProductEditorValues) => void;
      queueNavigation: ReactNode;
    }) => {
      const [editing, setEditing] = useState(false);
      return (
        <div>
          {queueNavigation}
          {editing ? (
            <label>
              Product name
              <input
                aria-label="Product name"
                onChange={(event) => onValuesChange({ ...initialValues, name: event.target.value })}
                value={initialValues.name}
              />
            </label>
          ) : (
            <button onClick={() => setEditing(true)} type="button">
              Continue
            </button>
          )}
        </div>
      );
    },
  };
});

const firstValues = { ...createEmptyProductEditorValues("stocked"), name: "First import" };
const secondValues = { ...createEmptyProductEditorValues("unique"), name: "Second import" };

const initialState: ProductImportSessionState = {
  source: "json",
  ignoredAssetCount: 2,
  selectedImportId: "child-1",
  children: [
    {
      importId: "child-1",
      values: firstValues,
      issues: [],
      status: "ready",
      isDirty: false,
      persistence: null,
    },
    {
      importId: "child-2",
      values: secondValues,
      issues: [],
      status: "ready",
      isDirty: false,
      persistence: null,
    },
  ],
};

describe("ProductImportSession", () => {
  it("keeps each imported product's editor values while switching queue items", () => {
    render(<ProductImportSession initialState={initialState} onRequestClose={vi.fn()} />);

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
