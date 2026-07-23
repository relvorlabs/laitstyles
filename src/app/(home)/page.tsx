import type { Metadata } from "next";
import { StorefrontHome } from "@/features/storefront/home/storefront-home";
import {
  listPublishedProducts,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Laitstyles — Curated Premium Fashion",
  description:
    "Laitstyles — curated premium pre-owned fashion, vintage pieces and wardrobe essentials.",
};

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    listPublishedProducts({ limit: 24 }),
    listStorefrontCategories(),
  ]);

  return <StorefrontHome categories={categories} products={products} />;
}
