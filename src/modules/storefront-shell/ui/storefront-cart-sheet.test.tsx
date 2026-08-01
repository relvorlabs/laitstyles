// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";

const product: Product = {
  id: "11111111-1111-4111-8111-111111111111",
  databaseId: "11111111-1111-4111-8111-111111111111",
  slug: "linen-shirt",
  name: "Linen shirt",
  brand: "Laitstyles",
  brandStatus: "Branded",
  category: "The Edit",
  type: "Shirts",
  style: "Minimal",
  price: 25_000,
  referencePrice: null,
  condition: "A+",
  size: "M",
  fit: "Regular",
  colour: "Cream",
  inventory: "one-of-one",
  stock: 1,
  status: "available",
  new: false,
  saved: 0,
  flaw: "None",
  material: "Linen",
  careInstructions: "Hand wash",
  defaultImage: null,
  images: [],
};

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  removeLine: vi.fn(),
  changeQuantity: vi.fn(),
  toggleProduct: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/products/client/storefront-catalogue", () => ({
  useStorefrontCatalogue: () => ({
    data: { availability: "ready" },
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  }),
}));
vi.mock("@/modules/storefront-shell/client/storefront-runtime", () => ({
  useStorefrontCart: () => ({
    lines: [],
    views: [
      {
        product,
        lineKey: `${product.id}:default`,
        lineQty: 1,
        variantId: null,
        variantLabel: null,
        colour: product.colour,
        size: product.size,
        unitPriceNaira: product.price,
      },
    ],
    count: 1,
    subtotal: product.price,
    hydrated: true,
    removeLine: mocks.removeLine,
    changeQuantity: mocks.changeQuantity,
  }),
  useStorefrontSavedItems: () => ({
    idSet: new Set<string>(),
    toggleProduct: mocks.toggleProduct,
  }),
  useStorefrontOverlay: () => ({
    openId: "cartDrawer",
    open: mocks.open,
    close: mocks.close,
  }),
}));
vi.mock("@/modules/products/ui/storefront/product-media", () => ({
  getProductDefaultImage: () => null,
}));
vi.mock("@/modules/checkout/ui/storefront/storefront-checkout-dialog", () => ({
  StorefrontCheckoutDialog: () => null,
}));
vi.mock("@/components/ui/cloud-image", () => ({ CloudImage: () => null }));
vi.mock("@/components/ui/sheet", async () => {
  const React = await import("react");
  return {
    Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    SheetFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
    SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
    SheetTrigger: ({
      children,
      render,
    }: {
      children: React.ReactNode;
      render: React.ReactElement;
    }) => React.cloneElement(render, undefined, children),
  };
});

import { StorefrontCartSheet } from "@/modules/storefront-shell/ui/storefront-cart-sheet";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StorefrontCartSheet", () => {
  it("uses familiar cart language and an amount-led checkout action", () => {
    render(<StorefrontCartSheet />);

    expect(screen.getByRole("heading", { name: "Your cart" })).toBeInTheDocument();
    expect(screen.getByText("Linen shirt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checkout · ₦25,000" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue shopping" })).toBeEnabled();
    expect(screen.queryByText(/private edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/atelier/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/consider these pieces/i)).not.toBeInTheDocument();
  });
});
