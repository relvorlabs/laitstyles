import type { Metadata } from "next";
import { StorefrontHome } from "@/features/storefront/home/storefront-home";
import {
  countPublishedProducts,
  listPublishedProducts,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Laitstyles — Curated Premium Fashion",
  description:
    "Laitstyles — curated premium pre-owned fashion, vintage pieces and wardrobe essentials.",
};

export default async function HomePage() {
  const [products, categories, total] = await Promise.all([
    listPublishedProducts({ limit: 24 }),
    listStorefrontCategories(),
    countPublishedProducts(),
  ]);

  return <StorefrontHome categories={categories} products={products} total={total} />;
}
