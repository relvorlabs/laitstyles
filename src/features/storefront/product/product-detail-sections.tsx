import {
  CheckmarkBadge01Icon,
  CheckmarkCircle01Icon,
  DeliveryTruck01Icon,
  HeadphonesIcon,
  Leaf01Icon,
  LockIcon,
  RefreshIcon,
  ScanIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetailPresentation } from "./product-detail-presentation";
import { Reveal } from "./reveal";

const SERVICE_ITEMS = [
  { icon: DeliveryTruck01Icon, title: "Delivery", body: "Timing shown at checkout" },
  { icon: RefreshIcon, title: "Returns", body: "Eligibility shown before purchase" },
  { icon: LockIcon, title: "Checkout", body: "Payment details shown at checkout" },
  { icon: HeadphonesIcon, title: "Customer support", body: "Support options in the storefront" },
] as const;

export function ProductBreadcrumb({ product }: { product: Product }) {
  return (
    <nav
      className="mx-auto w-full max-w-[1380px] px-3 py-5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground md:px-4"
      aria-label="Breadcrumb"
      data-pdp-section="breadcrumb"
    >
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link className="transition-colors hover:text-foreground" href="/">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="transition-colors hover:text-foreground" href="/products">
            {product.category}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="transition-colors hover:text-foreground" href="/products">
            {product.type}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-foreground" aria-current="page">
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

export function ProductHeroEditorial({ product }: { product: Product }) {
  return (
    <>
      <ProductTrustStrip product={product} />
      <ProductWhySection product={product} />
    </>
  );
}

function ProductTrustStrip({ product }: { product: Product }) {
  const items = [
    {
      icon: Leaf01Icon,
      title: product.material,
      body: "Material as listed",
    },
    {
      icon: ScanIcon,
      title: `${product.fit} cut`,
      body: `Tagged size ${product.size || "not specified"}`,
    },
    {
      icon: CheckmarkBadge01Icon,
      title: "Quality checked",
      body: `Grade ${product.condition}`,
    },
    {
      icon: RefreshIcon,
      title: "Easy returns",
      body: "7-day return window",
    },
  ];

  return (
    <div
      className="mt-4 grid grid-cols-2 overflow-hidden rounded-sm border border-border bg-surface-panel sm:grid-cols-4"
      data-pdp-section="trust"
    >
      {items.map((item, index) => (
        <div
          key={item.title}
          className={`p-4 ${index % 2 === 0 ? "border-r border-border sm:border-r-0" : ""} ${index < 2 ? "border-b border-border sm:border-b-0" : ""} ${index > 0 ? "sm:border-l sm:border-border" : ""}`}
        >
          <HugeiconsIcon aria-hidden="true" icon={item.icon} size={20} strokeWidth={1.5} />
          <p className="mt-3 text-[11px] font-semibold">{item.title}</p>
          <p className="mt-1 text-[9px] text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function ProductWhySection({ product }: { product: Product }) {
  const image = product.images[1] ?? product.images[0];
  const points = [
    `${product.material} construction as described in the catalogue.`,
    `${product.fit} proportions with ${product.style.toLowerCase()} styling.`,
    product.inventory === "one-of-one"
      ? "The exact photographed piece is the one delivered."
      : `${product.stock} ${product.stock === 1 ? "piece is" : "pieces are"} currently available.`,
  ];

  return (
    <Reveal
      as="section"
      aria-labelledby="product-why-title"
      className="mt-4 grid overflow-hidden rounded-sm border border-border bg-surface-panel md:grid-cols-[0.92fr_1.08fr]"
      data-pdp-section="why"
    >
      <div className="relative min-h-[360px] overflow-hidden bg-surface-sunken">
        {image ? (
          <Image
            src={image}
            alt={`${product.name}, material and construction view`}
            fill
            sizes="(min-width: 768px) 38vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-overlay to-transparent" />
        <p className="absolute bottom-5 left-5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-surface-inverse-foreground">
          Material study
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Why you’ll love it
        </p>
        <h2 id="product-why-title" className="mt-3 font-serif text-4xl font-medium leading-[1.02]">
          Considered form, clearly described.
        </h2>
        <ul className="mt-7 grid gap-4 text-[12px] leading-6 text-muted-foreground">
          {points.map((point) => (
            <li className="flex gap-3" key={point}>
              <HugeiconsIcon
                aria-hidden="true"
                className="mt-1 shrink-0 text-foreground"
                icon={CheckmarkCircle01Icon}
                size={16}
                strokeWidth={1.6}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em]">
          <span className="border border-border px-3 py-2">{product.material}</span>
          <span className="border border-border px-3 py-2">{product.fit} fit</span>
          <span className="border border-border px-3 py-2">Grade {product.condition}</span>
        </div>
      </div>
    </Reveal>
  );
}

export function ProductSizeGuide({
  product,
  presentation,
}: {
  product: Product;
  presentation: ProductDetailPresentation;
}) {
  const sizeOptions = presentation.sizes.length
    ? presentation.sizes
    : [{ label: product.size || "One size", value: product.size || "One size", available: true }];
  const sizes = sizeOptions.filter(
    (size, index, allSizes) =>
      allSizes.findIndex((candidate) => candidate.value === size.value) === index,
  );
  const measurementLabels = presentation.measurements.length
    ? presentation.measurements
    : [
        { label: "Chest", value: "—", position: 0 },
        { label: "Length", value: "—", position: 1 },
        { label: "Shoulder", value: "—", position: 2 },
        { label: "Sleeve", value: "—", position: 3 },
      ];
  const image = product.images[2] ?? product.images[0];

  return (
    <Reveal
      as="section"
      id="size-guide"
      aria-labelledby="size-guide-title"
      className="mx-auto w-full max-w-[1380px] scroll-mt-24 px-3 py-14 md:px-4"
      data-pdp-section="size-guide"
    >
      <div className="overflow-hidden rounded-sm border border-border bg-surface-panel">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-6 sm:p-8">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              Fit reference
            </p>
            <h2 id="size-guide-title" className="mt-2 font-serif text-4xl font-medium">
              Size guide
            </h2>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Only catalogue measurements are shown; unavailable values use an em dash.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-x-auto p-5 sm:p-8">
            <table className="w-full min-w-[620px] border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-surface-sunken">
                  <th className="border border-border p-4">Size</th>
                  {sizes.map((size) => (
                    <th key={size.value} className="border border-border p-4 text-center">
                      {size.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurementLabels.map((measurement) => (
                  <tr key={measurement.label}>
                    <th className="border border-border p-4 font-semibold">{measurement.label}</th>
                    {sizes.map((size) => {
                      const matchesTaggedSize =
                        sizes.length === 1 ||
                        size.value.toLowerCase() === product.size.toLowerCase();
                      return (
                        <td key={size.value} className="border border-border p-4 text-center">
                          {matchesTaggedSize ? measurement.value : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[9px] text-muted-foreground">
              Measurements are garment measurements. Compare them with a similar piece you own.
            </p>
          </div>

          <div className="relative min-h-[360px] overflow-hidden border-t border-border bg-surface-sunken lg:border-l lg:border-t-0">
            {image ? (
              <Image
                src={image}
                alt={`${product.name}, fit reference`}
                fill
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-overlay to-transparent" />
            <div className="absolute bottom-5 left-5 max-w-xs text-surface-inverse-foreground">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] opacity-60">
                Fit note
              </p>
              <p className="mt-2 text-[12px] leading-6">
                Listed as a {product.fit.toLowerCase()} fit in tagged size{" "}
                {product.size || "not specified"}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function ServiceStrip() {
  return (
    <Reveal as="div" className="mx-auto w-full max-w-[1380px] px-3 md:px-4">
      <section
        className="grid grid-cols-2 overflow-hidden rounded-sm border border-border bg-surface-panel md:grid-cols-4"
        aria-label="Service benefits"
        data-pdp-section="service-benefits"
      >
        {SERVICE_ITEMS.map((item, index) => (
          <div
            key={item.title}
            className={`p-5 ${index % 2 === 0 ? "border-r border-border md:border-r-0" : ""} ${index < 2 ? "border-b border-border md:border-b-0" : ""} ${index > 0 ? "md:border-l md:border-border" : ""}`}
          >
            <HugeiconsIcon aria-hidden="true" icon={item.icon} size={20} strokeWidth={1.5} />
            <p className="mt-3 text-[10px] font-semibold">{item.title}</p>
            <p className="mt-1 text-[9px] text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>
    </Reveal>
  );
}
