"use client";

import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { money } from "@/modules/products/ui/storefront/catalogue-data";
import { getProductDefaultImage } from "@/modules/products/ui/storefront/product-media";
import { openQuickView } from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import { IconArrow } from "@/modules/storefront-shell/ui/storefront-icons";
import type { OpenHomeShop } from "../home-types";

export function HeroSection({ openShop }: { openShop: OpenHomeShop }) {
  const { products } = useStorefrontCatalogueData();
  const distinctProducts = [...new Map(products.map((product) => [product.id, product])).values()];
  const heroProduct = distinctProducts.at(0);
  if (!heroProduct) return null;
  const heroImage = getProductDefaultImage(heroProduct);
  if (!heroImage) return null;

  const sideProducts = distinctProducts.slice(1, 3).map((product, index) => ({
    product,
    eyebrow:
      index === 0
        ? product.inventory === "one-of-one"
          ? "One of one"
          : "New arrival"
        : "Archive outerwear",
  }));

  return (
    <section className="hero">
      <div className="shell hero-grid">
        <article className="hero-main">
          <CloudImage
            alt={heroProduct.name}
            height={2250}
            loading="eager"
            sizes="(min-width: 861px) 66vw, 100vw"
            src={heroImage}
            width={1800}
          />
          <div className="hero-copy">
            <span className="eyebrow">Drop 07 · Tailored pieces</span>
            <h1 className="hero-title">
              Wear it now. <em>Keep it longer.</em>
            </h1>
            <p>Premium pre-owned fashion selected for condition, fit and lasting wardrobe value.</p>
            <div className="hero-actions">
              <Button onClick={() => openShop({ collection: "new" })} type="button">
                Shop new arrivals
              </Button>
              <Button onClick={() => openQuickView(heroProduct.id)} type="button">
                Shop the feature
              </Button>
            </div>
          </div>
        </article>
        {sideProducts.length > 0 ? (
          <div className="hero-side">
            {sideProducts.map(({ product, eyebrow }) => {
              const image = getProductDefaultImage(product);
              if (!image) return null;
              return (
                <Button
                  className="hero-card h-auto w-full justify-start p-0 text-left"
                  key={`hero-side:${product.id}`}
                  onClick={() => openQuickView(product.id)}
                  type="button"
                  variant="ghost"
                >
                  <span className="contents">
                    <CloudImage
                      alt={product.name}
                      height={1125}
                      sizes="(min-width: 861px) 34vw, 100vw"
                      src={image}
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
                      <span className="hero-card-arrow">
                        <IconArrow />
                      </span>
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
