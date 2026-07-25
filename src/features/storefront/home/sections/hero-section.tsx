"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { money } from "@/modules/products/ui/storefront/catalogue-data";
import { openQuickView } from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import { IconArrow } from "@/features/storefront/shared/storefront-icons";
import type { OpenHomeShop } from "../home-types";

export function HeroSection({ openShop }: { openShop: OpenHomeShop }) {
  const { products } = useStorefrontCatalogueData();
  const heroBlazer = products[0];
  const heroDenim = products[1] ?? heroBlazer;
  const heroHarrington = products[15] ?? heroBlazer;
  if (!heroBlazer || !heroDenim || !heroHarrington) return null;
  const sideProducts = [
    [heroDenim, "One of one"],
    [heroHarrington, "Archive outerwear"],
  ] as const;

  return (
    <section className="hero">
      <div className="shell hero-grid">
        <article className="hero-main">
          <Image
            alt={heroBlazer.name}
            height={2250}
            priority
            sizes="(min-width: 861px) 66vw, 100vw"
            src={heroBlazer.images[0]}
            width={1800}
          />
          <div className="hero-copy">
            <span className="eyebrow">Drop 07 · Tailored pieces</span>
            <h1 className="hero-title">Wear it now. <em>Keep it longer.</em></h1>
            <p>Premium pre-owned fashion selected for condition, fit and lasting wardrobe value.</p>
            <div className="hero-actions">
              <Button onClick={() => openShop({ collection: "new" })} type="button">
                Shop new arrivals
              </Button>
              <Button onClick={() => openQuickView(heroBlazer.id)} type="button">
                Shop the blazer
              </Button>
            </div>
          </div>
        </article>
        <div className="hero-side">
          {sideProducts.map(([product, eyebrow]) => (
            <Button
              className="hero-card h-auto w-full justify-start p-0 text-left"
              key={product.id}
              onClick={() => openQuickView(product.id)}
              type="button"
              variant="ghost"
            >
              <span className="contents">
                <Image
                  alt={product.name}
                  height={1125}
                  sizes="(min-width: 861px) 34vw, 100vw"
                  src={product.images[0]}
                  width={900}
                />
                <span className="hero-card-info">
                  <span>
                    <span className="eyebrow">{eyebrow}</span>
                    <span className="block text-[inherit]">{product.name}</span>
                    <span className="block">
                      Size {product.size} · Grade {product.condition} · {money(product.price)}
                    </span>
                  </span>
                  <span className="hero-card-arrow"><IconArrow /></span>
                </span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
