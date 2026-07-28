// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { productKeys } from "@/modules/products/client/keys";
import type { AdminProduct, ProductTaxonomyItem } from "@/modules/products/types";
import { CatalogueStructureWorkspace } from "./catalogue-structure-workspace";

vi.mock("next-cloudinary", () => ({
  CldUploadButton: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

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
});
