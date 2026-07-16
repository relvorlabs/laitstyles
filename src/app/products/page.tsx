import type { Metadata } from "next";
import { ProductCatalogue } from "@/features/storefront/catalogue/product-catalogue";
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";

export const metadata: Metadata = {
  title: "Shop all pieces — Laitstyles",
  description: "Browse the complete Laitstyles catalogue of curated premium pre-owned fashion.",
};

export default function ProductsPage() {
  return <ProductCatalogue fontClassName={storefrontFontClassName} />;
}
