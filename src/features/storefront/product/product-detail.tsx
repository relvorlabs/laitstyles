import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetail as CanonicalProductDetail } from "@/lib/storefront/types";
import { ProductCampaign } from "./product-campaign";
import { buildProductDetailPresentation } from "./product-detail-presentation";
import {
  ProductBreadcrumb,
  ProductHeroEditorial,
  ProductSizeGuide,
  ServiceStrip,
} from "./product-detail-sections";
import { ProductHero } from "./product-hero";
import { ProductInformation } from "./product-information";
import { ProductRecommendations } from "./product-recommendations";
import { ProductReviews } from "./product-reviews";

export function ProductDetail({
  product,
  detail,
  fontClassName,
}: {
  product: Product;
  detail: CanonicalProductDetail;
  fontClassName: string;
}) {
  const presentation = buildProductDetailPresentation(product, detail);

  return (
    <main id="main" className={`${fontClassName} lst-catalogue`}>
      <ProductBreadcrumb product={product} />

      <ProductHero key={product.id} product={product} presentation={presentation}>
        <ProductHeroEditorial product={product} />
      </ProductHero>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <ProductInformation product={product} presentation={presentation} />
        <aside className="rounded-sm border border-border bg-surface-panel p-5 sm:p-6">
          <ProductRecommendations
            product={product}
            title="Complete the look"
            eyebrow="Styled with"
            columns="styled"
          />
        </aside>
      </section>

      <ProductCampaign frames={presentation.campaignFrames} />
      <ProductSizeGuide product={product} presentation={presentation} />
      <ProductReviews presentation={presentation} />
      <ServiceStrip />

      <div className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8">
        <ProductRecommendations
          product={product}
          title="You may also like"
          eyebrow="Continue the edit"
          columns="related"
        />
      </div>
    </main>
  );
}
