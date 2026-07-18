"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetailPresentation } from "./product-detail-presentation";

function scrollToSizeGuide() {
  document.getElementById("size-guide")?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

export function ProductInformation({
  product,
  presentation,
}: {
  product: Product;
  presentation: ProductDetailPresentation;
}) {
  return (
    <Tabs
      defaultValue="details"
      className="overflow-hidden rounded-sm border border-border bg-surface-panel"
    >
      <TabsList
        variant="line"
        className="h-14 w-full justify-start gap-0 overflow-x-auto border-b border-border px-3"
        aria-label="Product information"
      >
        <TabsTrigger
          className="min-h-12 shrink-0 px-4 font-mono text-[10px] uppercase tracking-[0.16em]"
          value="details"
        >
          Details
        </TabsTrigger>
        <TabsTrigger
          className="min-h-12 shrink-0 px-4 font-mono text-[10px] uppercase tracking-[0.16em]"
          value="fabric"
        >
          Fabric & care
        </TabsTrigger>
        <TabsTrigger
          className="min-h-12 shrink-0 px-4 font-mono text-[10px] uppercase tracking-[0.16em]"
          value="fit"
        >
          Size & fit
        </TabsTrigger>
        <TabsTrigger
          className="min-h-12 shrink-0 px-4 font-mono text-[10px] uppercase tracking-[0.16em]"
          value="shipping"
        >
          Shipping & returns
        </TabsTrigger>
      </TabsList>

      <TabsContent className="min-h-[260px] p-6 sm:p-8" value="details">
        <h3 className="font-serif text-3xl font-medium">Product details</h3>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          {presentation.description}
        </p>
        <dl className="mt-7 grid gap-x-8 gap-y-4 text-[11px] sm:grid-cols-2">
          <Detail label="Brand" value={product.brand} />
          <Detail label="Category" value={`${product.category} / ${product.type}`} />
          <Detail label="Condition" value={`Grade ${product.condition}`} />
          <Detail label="Inventory" value={product.inventory.replaceAll("-", " ")} />
          {product.flaw !== "None" ? <Detail label="Disclosed note" value={product.flaw} /> : null}
        </dl>
      </TabsContent>

      <TabsContent className="min-h-[260px] p-6 sm:p-8" value="fabric">
        <h3 className="font-serif text-3xl font-medium">Fabric & care</h3>
        <dl className="mt-7 grid gap-6 sm:grid-cols-2">
          <Detail label="Material" value={product.material} />
          <Detail label="Care" value={product.careInstructions} />
        </dl>
      </TabsContent>

      <TabsContent className="min-h-[260px] p-6 sm:p-8" value="fit">
        <h3 className="font-serif text-3xl font-medium">Size & fit</h3>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
          Tagged size {product.size || "not specified"}; catalogue fit is{" "}
          {product.fit.toLowerCase()}. Review the available garment measurements before purchasing.
        </p>
        <Button className="mt-6" type="button" onClick={scrollToSizeGuide} variant="outline">
          Open size guide
        </Button>
      </TabsContent>

      <TabsContent className="min-h-[260px] p-6 sm:p-8" value="shipping">
        <h3 className="font-serif text-3xl font-medium">Shipping & returns</h3>
        <div className="mt-6 grid gap-5 text-sm leading-7 text-muted-foreground sm:grid-cols-2">
          <p>
            Lagos delivery is typically 1–2 business days. Other states are typically 2–5 business
            days.
          </p>
          <p>
            Return requests are accepted within 7 days when the item remains unworn, unwashed, and
            tagged.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3">
      <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 leading-6">{value}</dd>
    </div>
  );
}
