"use client";

import {
  ChevronDown,
  Expand,
  Heart,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatHoldTime, useShop } from "@/components/shop/shop-provider";
import {
  findCatalogueProduct,
  galleryForProduct,
  naira,
  type PlpProduct,
  pdpHref,
  plpItems,
} from "@/lib/catalogue";

const faqs = [
  {
    question: "How was this piece graded?",
    answer:
      "Excellent pieces show almost no visible wear. Good pieces may show light, photographed signs of use without affecting wearability.",
  },
  {
    question: "What happens when I reserve it?",
    answer:
      "The piece moves into your reserved rail for 15 minutes. During that hold, another shopper cannot complete checkout with it.",
  },
  {
    question: "Can I return a one-of-one item?",
    answer:
      "Yes. Contact care@laitstyle.ng within 48 hours of delivery if the piece differs materially from its listing or measurements.",
  },
];

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const product = findCatalogueProduct(params.slug);
  const gallery = useMemo(() => galleryForProduct(product), [product]);
  const { reserve, release, isHeld, secondsFor } = useShop();
  const [imageIndex, setImageIndex] = useState(0);
  const [wishlist, setWishlist] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [notified, setNotified] = useState(false);

  const held = isHeld(product.id);
  const secondsLeft = secondsFor(product.id);
  const expired = held && secondsLeft <= 0;
  const unavailable = product.state === "sold" || product.state === "resOthers";
  const related = plpItems
    .filter(
      (item) =>
        item.id !== product.id && item.category === product.category && item.state !== "sold",
    )
    .slice(0, 4);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setSizeGuideOpen(false);
      }
      if (lightboxOpen && event.key === "ArrowRight") {
        setImageIndex((current) => (current + 1) % gallery.length);
      }
      if (lightboxOpen && event.key === "ArrowLeft") {
        setImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gallery.length, lightboxOpen]);

  function handlePrimaryAction() {
    if (held) {
      if (expired) reserve(product);
      return;
    }
    if (unavailable) {
      setNotified(true);
      return;
    }
    reserve(product);
  }

  const status = productStatus(product, held, secondsLeft, notified);

  return (
    <>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-20 max-sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-1 pb-2.5 pt-[26px]">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[15px] tabular-nums">№&nbsp;{product.rank + 104}</span>
            <span className="h-px w-[22px] bg-[#C6C4BB]" />
            <span className="text-[11px] uppercase tracking-[.34em] text-[#8A887E]">
              One of One
            </span>
          </div>
          <div className="text-[12.5px] text-[#9A988F]">
            <Link className="text-[#9A988F]" href="/">
              Home
            </Link>
            <span className="mx-[7px]">/</span>
            <Link
              className="text-[#9A988F]"
              href={`/shop?category=${encodeURIComponent(product.category.toLowerCase())}`}
            >
              {product.category}
            </Link>
            <span className="mx-[7px]">/</span>
            <span>{product.name}</span>
          </div>
        </div>

        <section className="flex flex-wrap items-start gap-[52px] px-1 pb-10 pt-[34px]">
          <div className="min-w-[300px] flex-[1_1_480px]">
            <button
              aria-label={`Open image gallery for ${product.name}`}
              className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-[14px] bg-[linear-gradient(160deg,#ECEBE5,#E1E2DB)]"
              onClick={() => setLightboxOpen(true)}
              type="button"
            >
              <Image
                alt={product.name}
                className={unavailable ? "object-cover opacity-70 grayscale" : "object-cover"}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 560px"
                src={gallery[imageIndex]}
              />
              <span className="absolute left-4 top-4 rounded-[9px] bg-background/85 px-[9px] py-[4px] font-serif text-[13px] tabular-nums backdrop-blur">
                №&nbsp;{product.rank + 104}
              </span>
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-chip-border bg-white/92 px-[13px] py-1.5 text-[10.5px] uppercase tracking-[.24em] text-[#4A5540]">
                <span className="size-1.5 rounded-full bg-accent" />
                The only one
              </span>
              <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                <Expand aria-hidden="true" className="size-[13px]" />
                Zoom
              </span>
            </button>

            <div className="mt-3 grid grid-cols-5 gap-2.5">
              {gallery.map((image, index) => (
                <button
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={index === imageIndex}
                  className={
                    index === imageIndex
                      ? "relative aspect-[4/5] overflow-hidden rounded-[9px] border-2 border-primary bg-muted"
                      : "relative aspect-[4/5] overflow-hidden rounded-[9px] border border-border bg-muted"
                  }
                  key={image}
                  onClick={() => setImageIndex(index)}
                  type="button"
                >
                  <Image alt="" className="object-cover" fill sizes="120px" src={image} />
                </button>
              ))}
            </div>
          </div>

          <div className="sticky top-24 min-w-[290px] flex-[1_1_380px] max-md:static">
            <div className="mb-4 text-[11px] uppercase tracking-[.28em] text-[#8A887E]">
              {product.category} · {product.brand} · {product.era}
            </div>
            <h1 className="mb-[22px] text-balance font-serif text-[46px] font-medium italic leading-[1.04] tracking-[-.015em] max-sm:text-[38px]">
              {product.name}
            </h1>
            <p className="mb-2.5 max-w-[470px] font-serif text-xl italic leading-[1.5] text-[#3D3B35]">
              An individual piece selected for its texture, construction and second-life potential.
            </p>
            <p className="mb-[26px] max-w-[470px] text-[14px] leading-[1.7] text-[#6E6C64]">
              Professionally checked and photographed in Lagos. Natural wear is documented rather
              than hidden, so the piece you see is the piece that arrives.
            </p>

            <div className="mb-[22px] flex items-baseline gap-3 border-b border-border pb-[22px]">
              <span className="font-serif text-[30px] font-medium">{naira(product.price)}</span>
              <span className="text-[15px] text-[#A7A59B] line-through">
                {naira(product.original)}
              </span>
              <span className="text-[12px] font-semibold tracking-[.04em] text-accent">
                −{Math.round((1 - product.price / product.original) * 100)}%
              </span>
            </div>

            <div className="mb-[22px] flex flex-wrap gap-2.5">
              <span className="inline-flex items-center rounded-full border border-chip-border bg-chip-bg px-[15px] py-2 text-[12.5px] font-semibold text-[#4A5540]">
                <span className="mr-[9px] size-2 rounded-full bg-accent" />
                {product.condition} condition
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-card px-[15px] py-2 text-[12.5px] text-muted-foreground">
                Size {product.size} · {product.color}
              </span>
            </div>

            <div className="mb-[18px] flex items-center gap-2">
              <span
                className={
                  status.pulse
                    ? "size-2 animate-[leemPulse_1.8s_ease-in-out_infinite] rounded-full"
                    : "size-2 rounded-full"
                }
                style={{ backgroundColor: status.dot }}
              />
              <span
                aria-live="polite"
                className="text-[13px] font-medium"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            </div>

            <div className="flex flex-col gap-[11px]">
              <button
                className={
                  unavailable && !notified
                    ? "h-[54px] w-full rounded-full border border-[#DAD8CF] bg-[#EDECE6] text-[15px] font-semibold text-[#57554E]"
                    : "h-[54px] w-full rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                }
                onClick={handlePrimaryAction}
                type="button"
              >
                {primaryLabel(product, held, secondsLeft, notified)}
              </button>
              <div className="flex gap-[11px]">
                <button
                  className="h-12 flex-1 rounded-full border-[1.5px] border-primary bg-transparent text-[13.5px] font-medium"
                  onClick={() => setSizeGuideOpen(true)}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2">
                    <Ruler aria-hidden="true" className="size-4" />
                    Measurements &amp; fit
                  </span>
                </button>
                <button
                  aria-label={wishlist ? "Remove from wishlist" : "Save to wishlist"}
                  aria-pressed={wishlist}
                  className="flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-card"
                  onClick={() => setWishlist((value) => !value)}
                  type="button"
                >
                  <Heart
                    aria-hidden="true"
                    className={wishlist ? "fill-[#B04A45] text-[#B04A45]" : "fill-none"}
                  />
                </button>
              </div>
            </div>

            {held ? (
              <div
                className={
                  expired
                    ? "mt-3.5 rounded-xl border border-[#E4C4BF] bg-[#FBF0EE] px-4 py-3"
                    : "mt-3.5 rounded-xl border border-chip-border bg-chip-bg px-4 py-3"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={
                      expired ? "text-[13px] text-[#8A362F]" : "text-[13px] text-[#4A5540]"
                    }
                  >
                    {expired ? (
                      "Your hold expired."
                    ) : (
                      <>
                        Held for you — releases in{" "}
                        <strong className="tabular-nums">{formatHoldTime(secondsLeft)}</strong>
                      </>
                    )}
                  </span>
                  <button
                    className="text-[12.5px] text-[#8A887E] underline underline-offset-2"
                    onClick={() => (expired ? reserve(product) : release(product.id))}
                    type="button"
                  >
                    {expired ? "Re-hold" : "Release"}
                  </button>
                </div>
                {!expired ? (
                  <Link
                    className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#5F7043]"
                    href="/cart"
                  >
                    <ShoppingBag aria-hidden="true" className="size-3.5" />
                    Review your bag
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div className="mt-[18px] grid grid-cols-2 gap-3 border-t border-border pt-[18px] text-[12px] text-[#6E6C64]">
              <div className="flex items-center gap-2">
                <Truck aria-hidden="true" className="size-4 text-[#7C8C63]" />
                Lagos delivery from ₦3,500
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-4 text-[#7C8C63]" />
                Buyer protection included
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[1.1fr_.9fr] gap-12 border-t border-border px-1 py-12 max-md:grid-cols-1">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[.26em] text-[#8A887E]">
              The piece
            </div>
            <h2 className="font-serif text-[30px] font-medium">
              Condition, story &amp; measurements
            </h2>
            <p className="mt-4 max-w-[660px] text-[14px] leading-[1.75] text-[#57554E]">
              This {product.category.toLowerCase()} piece is graded{" "}
              {product.condition.toLowerCase()}. Its structure remains sound, with the character
              expected from a genuine second-hand garment.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
              {measurementRows(product).map((item) => (
                <div
                  className="rounded-[14px] border border-border bg-white px-4 py-4"
                  key={item.label}
                >
                  <div className="text-[11px] uppercase tracking-[.08em] text-[#A7A59B]">
                    {item.label}
                  </div>
                  <div className="mt-1 font-serif text-[21px]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[.26em] text-[#8A887E]">
              Good to know
            </div>
            <div className="border-t border-border">
              {faqs.map((faq, index) => (
                <div className="border-b border-border" key={faq.question}>
                  <button
                    aria-expanded={openFaq === index}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-[14px] font-semibold"
                    onClick={() => setOpenFaq((current) => (current === index ? -1 : index))}
                    type="button"
                  >
                    {faq.question}
                    <ChevronDown
                      aria-hidden="true"
                      className={
                        openFaq === index
                          ? "size-4 rotate-180 transition-transform"
                          : "size-4 transition-transform"
                      }
                    />
                  </button>
                  {openFaq === index ? (
                    <p className="pb-4 text-[13px] leading-[1.65] text-[#6E6C64]">{faq.answer}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {related.length ? (
          <section className="border-t border-border px-1 pt-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[.26em] text-[#8A887E]">
                  Same rail
                </div>
                <h2 className="font-serif text-[30px] font-medium">Pieces you may also like</h2>
              </div>
              <Link
                className="text-[13px] font-semibold text-[#7C8C63]"
                href={`/shop?category=${encodeURIComponent(product.category.toLowerCase())}`}
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {lightboxOpen ? (
        <div
          aria-label={`${product.name} image gallery`}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171612]/92 p-5"
          role="dialog"
        >
          <button
            aria-label="Close gallery"
            className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-full bg-white text-[#1B1A17]"
            onClick={() => setLightboxOpen(false)}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
          <div className="relative h-[88vh] w-full max-w-[760px] overflow-hidden rounded-[14px] bg-[#E4E5DE]">
            <Image
              alt={product.name}
              className="object-contain"
              fill
              sizes="90vw"
              src={gallery[imageIndex]}
            />
          </div>
        </div>
      ) : null}

      {sizeGuideOpen ? (
        <div
          aria-label="Measurements and fit"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171612]/60 p-5"
          role="dialog"
        >
          <div className="relative w-full max-w-[520px] rounded-[16px] bg-white p-7 shadow-laitstyle">
            <button
              aria-label="Close measurements"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-border"
              onClick={() => setSizeGuideOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
            <div className="text-[11px] uppercase tracking-[.24em] text-[#8A887E]">
              Measured flat
            </div>
            <h2 className="mt-1 font-serif text-[30px] font-medium">Measurements &amp; fit</h2>
            <p className="mt-2 text-[13px] leading-[1.6] text-[#6E6C64]">
              Compare these garment measurements with a similar piece you already own.
            </p>
            <div className="mt-6 border-t border-border">
              {measurementRows(product).map((item) => (
                <div
                  className="flex items-center justify-between border-b border-border py-3.5"
                  key={item.label}
                >
                  <span className="text-[13px] text-[#57554E]">{item.label}</span>
                  <span className="font-serif text-[18px]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProductCard({ product }: { product: PlpProduct }) {
  return (
    <article>
      <Link className="group block" href={pdpHref(product.id)}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted">
          <Image
            alt={product.name}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            src={product.image}
          />
          {product.state === "lastone" ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10.5px] font-semibold text-[#8A362F]">
              Last one
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[14px] font-medium">{product.name}</h3>
            <p className="mt-1 text-[12px] text-[#8A887E]">
              Size {product.size} · {product.condition}
            </p>
          </div>
          <span className="shrink-0 text-[13.5px] font-semibold">{naira(product.price)}</span>
        </div>
      </Link>
    </article>
  );
}

function primaryLabel(product: PlpProduct, held: boolean, secondsLeft: number, notified: boolean) {
  if (notified) return "You’ll be notified";
  if (held && secondsLeft <= 0) return "Re-hold this piece";
  if (held) return `Held for you · ${formatHoldTime(secondsLeft)}`;
  if (product.state === "sold") return "Find a similar piece";
  if (product.state === "resOthers") return "Notify me if released";
  if (product.state === "lastone") return "Reserve the last one";
  return "Reserve for 15 minutes";
}

function productStatus(product: PlpProduct, held: boolean, secondsLeft: number, notified: boolean) {
  if (notified)
    return {
      label: "We’ll alert you if this piece returns",
      color: "#5F7043",
      dot: "#7C8C63",
      pulse: false,
    };
  if (held && secondsLeft <= 0)
    return {
      label: "Your hold expired — re-hold if still available",
      color: "#8A362F",
      dot: "#B4453C",
      pulse: false,
    };
  if (held)
    return {
      label: `Reserved by you · ${formatHoldTime(secondsLeft)}`,
      color: "#4A5540",
      dot: "#7C8C63",
      pulse: true,
    };
  if (product.state === "sold")
    return {
      label: "Sold — this exact piece has found a home",
      color: "#8A887E",
      dot: "#8A887E",
      pulse: false,
    };
  if (product.state === "resOthers")
    return {
      label: "Currently held by another shopper",
      color: "#8A7434",
      dot: "#C9A227",
      pulse: true,
    };
  if (product.state === "lastone")
    return { label: "Last one — no restock", color: "#8A362F", dot: "#B4453C", pulse: true };
  return { label: "Available now", color: "#4A5540", dot: "#7C8C63", pulse: true };
}

function measurementRows(product: PlpProduct) {
  const sizeOffset = product.size === "S" ? -2 : product.size === "L" ? 3 : 0;
  return [
    { label: "Chest", value: `${54 + sizeOffset} cm` },
    { label: "Length", value: `${68 + sizeOffset} cm` },
    { label: "Sleeve", value: `${61 + sizeOffset} cm` },
  ];
}
