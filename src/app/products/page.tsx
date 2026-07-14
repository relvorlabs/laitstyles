import type { Metadata } from "next";
import { CatalogueLab } from "@/features/storefront/home-lab/catalogue-lab";
import { labFontClassName } from "@/features/storefront/home-lab/fonts";

export const metadata: Metadata = {
  title: "Shop all pieces — Laitstyles",
  description: "Browse the complete Laitstyles catalogue of curated premium pre-owned fashion.",
};

export default function ProductsPage() {
  return <CatalogueLab fontClassName={labFontClassName} />;
}
