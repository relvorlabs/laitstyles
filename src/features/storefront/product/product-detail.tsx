"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type Product,
  productSlug,
  productToHoldable,
  relatedProducts,
} from "@/features/storefront/shared/catalogue-data";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import { IconArrow } from "@/features/storefront/shared/storefront-icons";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { MobileBuyBar } from "./mobile-buy-bar";
import { ProductDetailAccordion } from "./product-detail-primitives";
import { ProductGallery } from "./product-gallery";
import { ProductPurchasePanel } from "./product-purchase-panel";

function ProductDetailApp({ product }: { product: Product }) {
  const storefront = useStorefront();
  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();
  const [showBar, setShowBar] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { setSelectedVariant, setQuickError } = storefront;

  useEffect(() => {
    void product.id;
    setSelectedVariant(null);
    setQuickError("");
  }, [product.id, setSelectedVariant, setQuickError]);

  useEffect(() => {
    const element = anchorRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), {
      rootMargin: "0px 0px -8px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isVariant = product.inventory === "variant";
  const isOneOfOne = product.inventory === "one-of-one";
  const available = product.status === "available";
  const canAdd = available && (!isVariant || Boolean(storefront.selectedVariant));

  const handleAdd = () => {
    if (isVariant && !storefront.selectedVariant) {
      setQuickError("Choose an available size before adding this piece.");
      return;
    }
    storefront.addToCart(product.id);
    storefront.open("cartDrawer");
  };

  const onShare = async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : `/products/${productSlug(product)}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard?.writeText(url);
        storefront.showToast("Link copied to clipboard.");
      }
    } catch {
      // Share cancelled or unavailable.
    }
  };

  const related = relatedProducts(storefront.products, product, 4);

  return (
    <>
      <main id="main" className="lst-catalogue">
        <nav
          className="mx-auto max-w-[1500px] px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:px-8"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <li>
              <Link className="hover:text-foreground" href="/">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link className="hover:text-foreground" href="/products">
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link className="hover:text-foreground" href="/products">
                {product.category}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-foreground" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <section className="mx-auto grid max-w-[1500px] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,0.82fr)] lg:px-8 xl:gap-16">
          <div className="min-w-0">
            <ProductGallery product={product} />
          </div>

          <ProductPurchasePanel
            product={product}
            anchorRef={anchorRef}
            canAdd={canAdd}
            onAdd={handleAdd}
            onShare={onShare}
          />
        </section>

        {product.flaw !== "None" ? (
          <section className="border-y border-border bg-surface-sunken">
            <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
              <p className="eyebrow text-brand-sage-strong">Disclosed detail</p>
              <h2 className="mt-3 max-w-2xl font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-medium leading-tight">
                {product.flaw}.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                Every flaw is inspected, photographed and disclosed before purchase — this piece
                remains stable and wearable.{" "}
                <Button
                  size="lg"
                  type="button"
                  className="inline-flex"
                  onClick={() =>
                    storefront.openImageViewerFor(product.id, product.images.length - 1)
                  }
                  variant="link"
                >
                  View the detail image
                </Button>
              </p>
            </div>
          </section>
        ) : null}

        <section className="border-y border-border bg-surface-panel">
          <div className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="eyebrow text-brand-sage-strong">Details</p>
                <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3.4rem)] font-medium leading-[0.98] tracking-[-0.03em]">
                  Useful information, without the usual guesswork.
                </h2>
              </div>
              <div className="divide-y divide-[color:var(--line)] border-y border-border">
                <ProductDetailAccordion title="Description" open>
                  {product.material} in {product.style.toLowerCase()} styling. Tagged size{" "}
                  {product.size} with a recommended fit of {product.fit}. The exact piece pictured
                  is the one delivered.
                </ProductDetailAccordion>
                <ProductDetailAccordion title="Delivery">
                  Lagos delivery is typically 1–2 business days. Other states are typically 2–5
                  business days. Tracking is shared after dispatch.
                </ProductDetailAccordion>
                <ProductDetailAccordion title="Returns">
                  Return requests are accepted within 7 days of delivery. The item must remain
                  unworn, unwashed and returned with the original Laitstyles tag attached.
                </ProductDetailAccordion>
                <ProductDetailAccordion title="Care">
                  Keep on a wide hanger away from direct heat. Follow standard care for{" "}
                  {product.material.toLowerCase()}. Do not machine wash or soak unless labelled
                  safe.
                </ProductDetailAccordion>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow text-brand-sage-strong">Reviews</p>
              <h2 className="mt-4 font-serif text-[clamp(1.9rem,4vw,3.4rem)] font-medium leading-[0.98] tracking-[-0.03em]">
                {isOneOfOne ? "No reviews for this exact piece." : "No reviews yet."}
              </h2>
              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                {isOneOfOne
                  ? "It is one of one, so nobody else has owned this listing."
                  : "Be the first to share how this piece fits and wears."}
              </p>
            </div>
            <div className="flex min-h-64 flex-col justify-between rounded-[16px] border border-border bg-surface-raised p-6 sm:p-8">
              <div>
                <p className="eyebrow text-muted-foreground">What can still help</p>
                <h3 className="mt-4 font-serif text-3xl leading-tight">
                  Need another measurement or a closer photo?
                </h3>
                <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                  Ask before buying. We can confirm a measurement, show a detail more closely or
                  help compare the fit.
                </p>
              </div>
              <Button
                type="button"
                className="mt-8 w-fit"
                onClick={() => storefront.open("supportModal")}
                variant="outline"
              >
                Ask about this piece
              </Button>
            </div>
          </div>
        </section>

        {related.length ? (
          <section id="related" className="border-t border-border bg-surface-sunken">
            <div className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="eyebrow text-brand-sage-strong">Keep looking</p>
                  <h2 className="mt-4 font-serif text-[clamp(2rem,5vw,3.4rem)] font-medium leading-[0.95] tracking-[-0.03em]">
                    Pieces with a similar point of view.
                  </h2>
                </div>
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
                >
                  View all
                  <IconArrow style={{ width: 18, height: 18 }} />
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {related.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                    isSaved={storefront.saved.has(relatedProduct.id)}
                    isHeld={relatedProduct.id in holdSecondsByProduct}
                    holdSeconds={holdSecondsByProduct[relatedProduct.id] ?? null}
                    onQuickView={storefront.openQuick}
                    onSave={storefront.toggleSaved}
                    onAdd={(id) => {
                      releaseProduct(id);
                      storefront.addToCart(id);
                    }}
                    onHold={(id) => {
                      const target = storefront.productById(id);
                      if (target) holdProduct(productToHoldable(target));
                    }}
                    onRelease={releaseProduct}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <MobileBuyBar product={product} visible={showBar} canAdd={canAdd} onAdd={handleAdd} />
    </>
  );
}

export function ProductDetail({
  product,
  fontClassName,
}: {
  product: Product;
  fontClassName: string;
}) {
  void fontClassName;
  return <ProductDetailApp product={product} />;
}
