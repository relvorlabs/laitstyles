import type { Metadata } from "next";
import { labFontClassName } from "@/features/storefront/home-lab/fonts";
import { StorefrontLab } from "@/features/storefront/home-lab/storefront-lab";

export const metadata: Metadata = {
  title: "Laitstyles — Curated Premium Fashion",
  description:
    "Laitstyles — curated premium pre-owned fashion, vintage pieces and wardrobe essentials.",
};

export default function HomePage() {
  return <StorefrontLab fontClassName={labFontClassName} />;
}
