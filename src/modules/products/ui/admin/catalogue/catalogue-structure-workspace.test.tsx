// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";
import { productKeys } from "@/modules/products/client/keys";
import type { AdminProduct, ProductTaxonomyItem } from "@/modules/products/types";
import { CatalogueStructureWorkspace } from "./catalogue-structure-workspace";

type CapturedUploadProps = {
  folder: string;
  label: string;
  maxFiles?: number;
  multiple?: boolean;
  onAsset: (asset: UploadedCloudinaryAsset) => boolean | undefined;
  onStatusChange?: (status: "opening" | "uploading" | "completed" | "cancelled" | "failed") => void;
};

let capturedUploadProps: CapturedUploadProps | undefined;

vi.mock("@/components/ui/cloud-upload-button", () => ({
  CloudUploadButton: (props: CapturedUploadProps) => {
    capturedUploadProps = props;
    return (
      <button onClick={() => props.onStatusChange?.("opening")} type="button">
        {props.label}
      </button>
    );
  },
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/admin/inventory/catalogue?tab=categories");
});

const taxonomy: ProductTaxonomyItem[] = [
  {
    id: "category:11111111-1111-4111-8111-111111111111",
    kind: "category",
    name: "Archive coats",
    slug: "archive-coats",
    imageUrl: "https://res.cloudinary.com/store/image/upload/coat.jpg",
    position: 0,
    productCount: 4,
    previewImageUrls: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "collection:22222222-2222-4222-8222-222222222222",
    kind: "collection",
    name: "After hours",
    slug: "after-hours",
    imageUrl: null,
    position: 0,
    productCount: 2,
    previewImageUrls: ["https://res.cloudinary.com/store/image/upload/story.jpg"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function renderWorkspace(initialTab: "categories" | "collections" = "categories") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(productKeys.taxonomy(), taxonomy);
  client.setQueryData(productKeys.list(), [] as AdminProduct[]);
  return render(
    <QueryClientProvider client={client}>
      <CatalogueStructureWorkspace initialTab={initialTab} />
    </QueryClientProvider>,
  );
}

describe("CatalogueStructureWorkspace", () => {
  it("renders image-led categories and opens an upload-backed editor", () => {
    renderWorkspace();
    expect(screen.getByRole("heading", { name: "Archive coats" })).toBeTruthy();
    expect(screen.getByText("4 products")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit Archive coats" }));
    expect(screen.getByRole("heading", { name: "Edit category" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Replace image" })).toBeTruthy();
    expect(screen.getByText(/preview remains local until/i)).toBeTruthy();
  });

  it("keeps the shared category uploader mounted while it opens", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload image" }));

    expect(screen.getByText("Opening category image uploader.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload image" })).toBeTruthy();
  });

  it("uses the shared uploader to update the category image preview", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "New category" }));

    expect(capturedUploadProps).toMatchObject({
      folder: "laitstyles/categories",
      label: "Upload image",
      multiple: false,
    });
    expect(capturedUploadProps?.maxFiles).toBeUndefined();

    act(() =>
      capturedUploadProps?.onAsset({
        publicId: "laitstyles/categories/archive-coats",
        url: "https://res.cloudinary.com/store/image/upload/v1/archive-coats.jpg",
        width: 1200,
        height: 800,
        format: "jpg",
        bytes: 2048,
      }),
    );

    expect(screen.getByRole("button", { name: "Replace image" })).toBeTruthy();
  });

  it("renders full collection stories without a collection upload control", () => {
    renderWorkspace("collections");
    expect(screen.getByRole("heading", { name: "After hours" })).toBeTruthy();
    expect(screen.getByText(/cover imagery is drawn from/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit story" }));
    expect(screen.getByRole("heading", { name: "Edit collection story" })).toBeTruthy();
    expect(screen.getByText(/no separate collection upload/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /upload/i })).toBeNull();
  });

  it("filters the active catalogue view", () => {
    renderWorkspace();
    fireEvent.change(screen.getByRole("textbox", { name: "Search categories" }), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No categories found")).toBeTruthy();
  });

  it("keeps the active catalogue tab in the URL", () => {
    window.history.replaceState(null, "", "/admin/inventory/catalogue?tab=categories");
    renderWorkspace();

    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));

    expect(window.location.search).toBe("?tab=collections");
  });

  it("shows an inline error when a category name is blank", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.click(screen.getByRole("button", { name: "Save category" }));

    expect(screen.getByText("Enter a category name.")).toBeTruthy();
    expect(screen.getByLabelText("Category name").getAttribute("aria-invalid")).toBe("true");
  });
});
