"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { money } from "@/features/storefront/shared/catalogue-data";
import { IconArrow } from "@/features/storefront/shared/storefront-icons";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import type { OpenHomeShop } from "../home-types";

export function HeroSection({ openShop }: { openShop: OpenHomeShop }) {
  const storefront = useStorefront();
  const heroBlazer = storefront.products[0];
  const heroDenim = storefront.products[1] ?? heroBlazer;
  const heroHarrington = storefront.products[15] ?? heroBlazer;
  if (!heroBlazer || !heroDenim || !heroHarrington) return null;

  return (
    <section className="hero">
      <div className="shell hero-grid">
        <article className="hero-main">
          <Image
            src={heroBlazer.images[0]}
            alt={heroBlazer.name}
            width={1800}
            height={2250}
            sizes="(min-width: 861px) 66vw, 100vw"
            priority
          />
          <div className="hero-copy">
            <span className="eyebrow">Drop 07 · Tailored pieces</span>
            <h1 className="hero-title">
              Wear it now. <em>Keep it longer.</em>
            </h1>
            <p>Premium pre-owned fashion selected for condition, fit and lasting wardrobe value.</p>
            <div className="hero-actions">
              <Button type="button" onClick={() => openShop({ collection: "new" })}>
                Shop new arrivals
              </Button>
              <Button type="button" onClick={() => storefront.openQuick(heroBlazer.id)}>
                Shop the blazer
              </Button>
            </div>
          </div>
        </article>

        <div className="hero-side">
          <Button
            className="hero-card h-auto w-full justify-start p-0 text-left"
            type="button"
            onClick={() => storefront.openQuick(heroDenim.id)}
            variant="ghost"
          >
            <span className="contents">
              <Image
                src={heroDenim.images[0]}
                alt={heroDenim.name}
                width={900}
                height={1125}
                sizes="(min-width: 861px) 34vw, 100vw"
              />
              <span className="hero-card-info">
                <span>
                  <span className="eyebrow">One of one</span>
                  <span className="block text-[inherit]">{heroDenim.name}</span>
                  <span className="block">
                    Size {heroDenim.size} · Grade {heroDenim.condition} · {money(heroDenim.price)}
                  </span>
                </span>
                <span className="hero-card-arrow">
                  <IconArrow />
                </span>
              </span>
            </span>
          </Button>

          <Button
            className="hero-card h-auto w-full justify-start p-0 text-left"
            type="button"
            onClick={() => storefront.openQuick(heroHarrington.id)}
            variant="ghost"
          >
            <span className="contents">
              <Image
                src={heroHarrington.images[0]}
                alt={heroHarrington.name}
                width={900}
                height={1125}
                sizes="(min-width: 861px) 34vw, 100vw"
              />
              <span className="hero-card-info">
                <span>
                  <span className="eyebrow">Archive outerwear</span>
                  <span className="block text-[inherit]">{heroHarrington.name}</span>
                  <span className="block">
                    Size {heroHarrington.size} · Grade {heroHarrington.condition} ·{" "}
                    {money(heroHarrington.price)}
                  </span>
                </span>
                <span className="hero-card-arrow">
                  <IconArrow />
                </span>
              </span>
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
