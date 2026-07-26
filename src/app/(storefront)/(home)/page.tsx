import type { Metadata } from "next";
import { StorefrontHome } from "@/features/storefront/home/storefront-home";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";

export const metadata: Metadata = {
  title: "Laitstyles — Curated Premium Fashion",
  description:
    "Laitstyles — curated premium pre-owned fashion, vintage pieces and wardrobe essentials.",
};

export default function HomePage() {
  return <StorefrontHome fontClassName={storefrontFontClassName} />;
}
