"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Expand,
  Heart,
  Info,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  findCatalogueProduct,
  galleryForProduct,
  naira,
  type PlpProduct,
  pdpHref,
  plpItems,
} from "@/lib/catalogue";
import { cn } from "@/lib/utils";

type HeldItem = { id: string; secondsLeft: number };

const reviewRows = [
  { label: "5 stars", pct: "90%", width: 90 },
  { label: "4 stars", pct: "2.5%", width: 6 },
  { label: "3 stars", pct: "2.5%", width: 6 },
  { label: "2 stars", pct: "2.5%", width: 6 },
  { label: "1 star", pct: "2.5%", width: 6 },
];

const reviews = [
  {
    initial: "D",
    name: "Daniel R.",
    date: "March 12, 2026",
    fit: "Fit: true to size",
    size: "M",
    text: "The quality exceeded my expectations \u2014 lightweight but still feels durable. Perfect for daily wear.",
  },
  {
    initial: "A",
    name: "Aisha K.",
    date: "March 10, 2026",
    fit: "Fit: slightly oversized",
    size: "S",
    text: "Love the design and the details. I wish it was a touch more fitted, but overall very comfortable and well kept.",
  },
  {
    initial: "M",
    name: "Michael T.",
    date: "March 8, 2026",
    fit: "Fit: true to size",
    size: "L",
    text: "Super functional and the material feels genuinely premium. You would never guess it was pre-loved.",
  },
  {
    initial: "S",
    name: "Sarah W.",
    date: "March 5, 2026",
    fit: "Fit: relaxed",
    size: "M",
    text: "Perfect layering piece. Works with almost everything in my wardrobe and arrived spotless.",
  },
  {
    initial: "K",
    name: "Kelechi L.",
    date: "March 2, 2026",
    fit: "Fit: true to size",
    size: "XL",
    text: "Great everyday piece. Light and breathable, but still structured and honestly graded.",
  },
];

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const product = findCatalogueProduct(params.slug);
  const gallery = useMemo(() => galleryForProduct(product), [product]);
  const [imgIdx, setImgIdx] = useState(0);
  const [wish, setWish] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [openFaq, setOpenFaq] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [extraHolds, setExtraHolds] = useState<HeldItem[]>([
    { id: "p14", secondsLeft: 863 },
    { id: "p7", secondsLeft: 587 },
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (!reserved) return value;
        const next = value - 1;
        if (next <= 0) {
          setReserved(false);
          return 900;
        }
        return next;
      });
      setExtraHolds((current) =>
        current
          .map((item) => ({ ...item, secondsLeft: item.secondsLeft - 1 }))
          .filter((item) => item.secondsLeft > 0),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [reserved]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setSizeGuideOpen(false);
      }
      if (lightboxOpen && event.key === "ArrowRight")
        setLightboxIdx((value) => (value + 1) % gallery.length);
      if (lightboxOpen && event.key === "ArrowLeft")
        setLightboxIdx((value) => (value - 1 + gallery.length) % gallery.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery.length, lightboxOpen]);

  const story = describe(product);
  const firstStop = story.indexOf(". ");
  const storyLead = firstStop > 0 ? story.slice(0, firstStop + 1) : story;
  const storyRest = firstStop > 0 ? story.slice(firstStop + 2) : "";
  const measures = measureRows(product);
  const pairItems = pairedProducts(product);
  const likeItems = shelfProducts(product);
  const heldProducts = heldList(product, reserved, secondsLeft, extraHolds);
  const recommended = plpItems
    .filter(
      (item) =>
        (item.state === "available" || item.state === "lastone") &&
        item.id !== product.id &&
        !heldProducts.some((held) => held.product.id === item.id),
    )
    .slice(0, 4);
  const stock = stockCopy(product, reserved);
  const currentImage = gallery[Math.min(imgIdx, gallery.length - 1)];
  const lightboxImage = gallery[Math.min(lightboxIdx, gallery.length - 1)];

  function reserveProduct() {
    if (reserved) {
      setCartOpen(true);
      return;
    }
    if (product.state === "sold") return;
    if (product.state === "resOthers") return;
    setReserved(true);
    setSecondsLeft(900);
    setCartOpen(true);
  }

  function quickHold(id: string) {
    setExtraHolds((current) =>
      current.some((item) => item.id === id) ? current : [...current, { id, secondsLeft: 900 }],
    );
    setCartOpen(true);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 max-sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-1 pb-2.5 pt-[26px]">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[15px] tabular-nums">
              &#8470;&nbsp;{accession(product)}
            </span>
            <span className="h-px w-[22px] bg-[#C6C4BB]" />
            <span className="text-[11px] uppercase tracking-[.34em] text-[#8A887E]">
              One of One
            </span>
          </div>
          <div className="text-[12.5px] text-[#9A988F]">
            <Link href="/" className="text-[#9A988F]">
              Home
            </Link>
            <span className="mx-[7px]">/</span>
            <Link href="/shop" className="text-[#9A988F]">
              {product.category}
            </Link>
            <span className="mx-[7px]">/</span>
            <span className="text-muted-foreground">{product.name}</span>
          </div>
        </div>

        <section className="flex flex-wrap items-start gap-[52px] px-1 pb-5 pt-[34px]">
          <div className="min-w-[300px] flex-[1_1_480px]">
            <button
              className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded bg-[linear-gradient(160deg,#ECEBE5,#E1E2DB)] p-0 animate-[leemSettle_.9s_cubic-bezier(.22,1,.36,1)_both]"
              onClick={() => {
                setLightboxIdx(imgIdx);
                setLightboxOpen(true);
              }}
              type="button"
              aria-label="View piece up close"
            >
              <Image
                alt={product.name}
                className={cn(
                  "object-cover",
                  product.state === "sold" || product.state === "resOthers"
                    ? "opacity-70 grayscale"
                    : "",
                )}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 560px"
                src={currentImage}
              />
              <span className="absolute left-4 top-4 rounded-sm bg-background/80 px-[9px] py-[3px] font-serif text-[13px] tabular-nums backdrop-blur">
                &#8470;&nbsp;{accession(product)}
              </span>
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-chip-border bg-white/90 px-[13px] py-1.5 text-[10.5px] uppercase tracking-[.24em] text-[#4A5540]">
                <span className="size-1.5 rounded-full bg-accent" />
                The only one
              </span>
              <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
                <Expand className="size-[13px]" />
                Zoom
              </span>
            </button>
            <div className="mt-3 flex gap-2.5">
              {gallery.map((image, index) => (
                <button
                  className={cn(
                    "relative flex-1 overflow-hidden rounded-[3px] border-[1.5px] bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)] p-0",
                    index === imgIdx ? "border-primary" : "border-border",
                  )}
                  key={image}
                  onClick={() => setImgIdx(index)}
                  type="button"
                >
                  <span className="block aspect-[4/5]" />
                  <Image
                    alt={product.name}
                    className="object-cover"
                    fill
                    sizes="120px"
                    src={image}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="sticky top-24 min-w-[290px] flex-[1_1_380px] max-md:static">
            <div className="mb-4 text-[11px] uppercase tracking-[.28em] text-[#8A887E]">
              {product.category} · {product.brand} · {product.era}
            </div>
            <h1 className="m-0 mb-[22px] text-balance font-serif text-[46px] font-medium italic leading-[1.04] tracking-[-.015em]">
              {product.name}
            </h1>
            <p className="m-0 mb-2.5 max-w-[460px] font-serif text-xl italic leading-[1.5] text-[#3D3B35]">
              {storyLead}
            </p>
            <p className="m-0 mb-[26px] max-w-[460px] text-sm leading-[1.7] text-[#6E6C64]">
              {storyRest}
            </p>

            <div className="mb-[22px] flex items-baseline gap-3 border-b border-border pb-[22px]">
              <span className="font-serif text-[30px] font-medium">{naira(product.price)}</span>
              <span className="text-[15px] text-[#A7A59B] line-through">
                {naira(product.original)}
              </span>
              <span className="text-xs font-semibold tracking-[.04em] text-accent">
                −{Math.round((1 - product.price / product.original) * 100)}%
              </span>
            </div>

            <div className="mb-[22px] flex flex-wrap gap-2.5">
              <Badge className="rounded-full border border-chip-border bg-chip-bg px-[15px] py-2 text-[12.5px] font-semibold text-[#4A5540] hover:bg-chip-bg">
                <span className="mr-[9px] size-2 rounded-full bg-accent" />
                {product.condition} condition
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border bg-card px-[15px] py-2 text-[12.5px] font-normal text-muted-foreground"
              >
                Size {product.size} · {product.color}
              </Badge>
            </div>

            <div className="mb-[18px] flex items-center gap-2">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  stock.pulse ? "animate-[leemPulse_1.8s_ease-in-out_infinite]" : "",
                )}
                style={{ background: stock.dot }}
              />
              <span
                aria-live="polite"
                className="text-[13px] font-medium"
                style={{ color: stock.color }}
              >
                {stock.label}
              </span>
            </div>

            <div className="flex flex-col gap-[11px]">
              <Button
                className={cn(
                  "h-[54px] w-full rounded-full text-[15px] font-semibold",
                  reserved || product.state === "resOthers"
                    ? "border-[1.5px] border-[#DAD8CF] bg-[#EDECE6] text-[#8A887E] hover:bg-[#EDECE6]"
                    : "",
                )}
                disabled={product.state === "resOthers"}
                onClick={reserveProduct}
              >
                {primaryLabel(product, reserved, secondsLeft)}
              </Button>
              <div className="flex gap-[11px]">
                <Button
                  className="h-12 flex-1 rounded-full border-[1.5px] border-primary bg-transparent text-[13.5px] font-medium text-primary hover:bg-transparent"
                  onClick={() => setSizeGuideOpen(true)}
                  variant="outline"
                >
                  <Ruler />
                  Measurements &amp; fit
                </Button>
                <Button
                  aria-label="Save to wishlist"
                  className="size-12 shrink-0 rounded-full border-[1.5px] border-border bg-card hover:bg-card"
                  onClick={() => setWish((value) => !value)}
                  variant="outline"
                >
                  <Heart className={cn(wish ? "fill-[#B04A45]" : "fill-none")} />
                </Button>
              </div>
            </div>

            {reserved ? (
              <Alert className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border-chip-border bg-chip-bg px-4 py-3">
                <ClockIcon />
                <AlertTitle className="sr-only">Held for you</AlertTitle>
                <AlertDescription className="flex-1 text-[13px] text-[#4A5540]">
                  Held for you &mdash; releases in{" "}
                  <strong className="tabular-nums">{formatSeconds(secondsLeft)}</strong>
                </AlertDescription>
                <button
                  className="text-[12.5px] text-[#8A887E] underline underline-offset-2"
                  onClick={() => {
                    setReserved(false);
                    setSecondsLeft(900);
                  }}
                  type="button"
                >
                  Release
                </button>
              </Alert>
            ) : null}

            <div className="mt-[18px] flex items-center gap-2 text-xs text-[#8A887E]">
              <ShieldCheck className="size-3.5" />
              Inspected, cleaned &amp; authenticated · 7-day returns
            </div>
          </div>
        </section>

        <Placard product={product} gallery={gallery} measures={measures} />

        <Alert className="my-[34px] flex flex-wrap items-center justify-between gap-7 rounded-lg border-0 bg-[#20261C] px-[34px] py-[38px] text-white">
          <div className="min-w-[280px] flex-[1_1_360px]">
            <AlertTitle className="mb-3 text-[11px] font-normal uppercase tracking-[.3em] text-white/55">
              Why there is only one
            </AlertTitle>
            <AlertDescription className="max-w-[520px] font-serif text-2xl italic leading-[1.4] text-white">
              Someone wore this before you. It won&rsquo;t come back after it sells &mdash; no
              restock, no second run. When it&rsquo;s gone, it&rsquo;s in the archive for good.
            </AlertDescription>
          </div>
          <Link
            className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/35 px-[22px] py-[13px] text-[13.5px] text-white"
            href="/shop"
          >
            See what&rsquo;s been rehomed
            <ArrowRight className="size-4" />
          </Link>
        </Alert>

        <ProductRail
          title="Wears well with"
          action="See the edit"
          products={pairItems}
          onQuickHold={quickHold}
        />
        <ShelfRail title={`More from the ${product.category} shelf`} products={likeItems} />
        <Reviews />
        <Faq openFaq={openFaq} setOpenFaq={setOpenFaq} />
      </main>

      <PdpLightbox
        gallery={gallery}
        image={lightboxImage}
        index={lightboxIdx}
        open={lightboxOpen}
        productName={product.name}
        setIndex={setLightboxIdx}
        setOpen={setLightboxOpen}
      />
      <SizeGuide
        measures={measures}
        open={sizeGuideOpen}
        product={product}
        setOpen={setSizeGuideOpen}
      />

      {/* INTEGRATION: Replace this PDP-local hold drawer with the global reservation/cart store when checkout wiring begins. */}
      <HoldDrawer
        currentProduct={product}
        heldProducts={heldProducts}
        open={cartOpen}
        recommended={recommended}
        reserved={reserved}
        setExtraHolds={setExtraHolds}
        setOpen={setCartOpen}
        setReserved={setReserved}
      />
    </>
  );
}

function Placard({
  product,
  gallery,
  measures,
}: {
  product: PlpProduct;
  gallery: string[];
  measures: { label: string; value: string }[];
}) {
  return (
    <section className="my-[22px] border-t border-border pb-2 pt-9 animate-[leemRise_.75s_cubic-bezier(.22,1,.36,1)_both]">
      <div className="mb-[26px] flex items-center gap-3.5">
        <span className="text-[11px] uppercase tracking-[.32em] text-[#8A887E]">The Placard</span>
        <Separator className="flex-1" />
        <span className="text-[11px] uppercase tracking-[.32em] text-[#8A887E]">
          Measured flat · cm
        </span>
      </div>
      <div className="flex flex-wrap items-stretch gap-11">
        <div className="min-w-[260px] flex-[1_1_300px]">
          <div className="relative aspect-square overflow-hidden rounded bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]">
            <Image
              alt="Condition detail, photographed close"
              className="object-cover"
              fill
              sizes="420px"
              src={gallery[1] || gallery[0]}
            />
          </div>
          <div className="mt-2.5 text-[11px] uppercase tracking-[.2em] text-[#9A988F]">
            Detail &mdash; as photographed, not retouched
          </div>
        </div>
        <div className="flex min-w-[280px] flex-[1_1_340px] flex-col">
          <div className="mb-[18px] flex items-baseline gap-3">
            <span className="font-serif text-[32px] font-medium">{product.condition}</span>
            <span className="text-[12.5px] text-[#8A887E]">condition grade</span>
          </div>
          <MeasurementRows rows={measures} />
          <p className="m-0 mt-[22px] border-l-2 border-accent bg-muted px-[18px] py-4 font-serif text-base italic leading-[1.6] text-[#3D3B35]">
            {flawNote(product)}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProductRail({
  title,
  action,
  products,
  onQuickHold,
}: {
  title: string;
  action: string;
  products: PlpProduct[];
  onQuickHold: (id: string) => void;
}) {
  return (
    <section className="px-1 pb-[30px] pt-2 animate-[leemRise_.75s_cubic-bezier(.22,1,.36,1)_both]">
      <div className="mb-[18px] flex items-center justify-between">
        <h2 className="m-0 font-serif text-[26px] font-medium italic">{title}</h2>
        <Link
          className="text-[13px] text-muted-foreground underline underline-offset-2"
          href="/shop"
        >
          {action}
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
        {products.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden rounded-md border-[#EAE8E0] bg-card p-0"
          >
            <ProductImageLink product={product} aspect="aspect-[1/1.1]" />
            <div className="px-3 pb-3.5 pt-3">
              <Link className="mb-1 block truncate text-[13px]" href={pdpHref(product.id)}>
                {product.name}
              </Link>
              <div className="mb-2.5 text-[13.5px] font-semibold">{naira(product.price)}</div>
              <button
                className="flex items-center gap-[7px] bg-transparent p-0 text-[12.5px]"
                onClick={() => onQuickHold(product.id)}
                type="button"
              >
                <ShoppingBag className="size-[15px]" />
                Reserve
              </button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ShelfRail({ title, products }: { title: string; products: PlpProduct[] }) {
  return (
    <section className="mb-2 pt-3.5 animate-[leemRise_.75s_cubic-bezier(.22,1,.36,1)_both]">
      <div className="mb-[18px] flex items-baseline gap-4">
        <h2 className="m-0 font-serif text-[26px] font-medium italic">{title}</h2>
        <span className="text-[12.5px] text-[#8A887E]">each one, the only one</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[18px]">
        {products.map((product) => (
          <div key={product.id}>
            <ProductImageLink product={product} aspect="aspect-[1/1.1]" rounded />
            <div className="px-0.5 pt-[11px]">
              <Link className="mb-[3px] block truncate text-[13px]" href={pdpHref(product.id)}>
                {product.name}
              </Link>
              <div className="mb-2 flex items-baseline gap-[7px]">
                <span className="text-[13.5px] font-semibold">{naira(product.price)}</span>
                <span className="text-xs text-[#A7A59B] line-through">
                  {naira(product.original)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section
      id="reviews"
      className="pb-2 pt-11 animate-[leemRise_.75s_cubic-bezier(.22,1,.36,1)_both]"
    >
      <h2 className="m-0 mb-2.5 font-serif text-[32px] font-medium italic">
        Notes from the last owners
      </h2>
      <p className="m-0 mb-[26px] max-w-[560px] text-sm leading-[1.6] text-[#8A887E]">
        Honest words from shoppers who gave these one-of-one pieces a second life &mdash; how they
        fit, wear, and hold up.
      </p>
      <div className="flex flex-wrap gap-11">
        <div className="flex-[0_0_260px]">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-serif text-[44px] font-medium">4.87</span>
            <span className="text-base text-[#8A887E]">out of 5</span>
          </div>
          <div className="mb-[18px] text-[12.5px] text-[#8A887E]">Based on 825 reviews</div>
          <div className="mb-[22px] flex flex-col gap-2">
            {reviewRows.map((row) => (
              <div className="flex items-center gap-2.5" key={row.label}>
                <span className="w-[52px] text-xs text-muted-foreground">{row.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7E5DD]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${row.width}%` }}
                  />
                </div>
                <span className="w-[38px] text-right text-[11.5px] text-[#8A887E]">{row.pct}</span>
              </div>
            ))}
          </div>
          <Button className="h-12 w-full rounded-full text-sm font-medium">Write a review</Button>
        </div>
        <div className="min-w-[300px] flex-[1_1_460px]">
          {reviews.map((review) => (
            <div className="flex gap-3.5 border-t border-[#EAE8E0] py-4" key={review.name}>
              <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#DCDACF] text-[13px] font-semibold text-[#6E6C64]">
                {review.initial}
              </div>
              <div className="flex-1">
                <div>
                  <span className="text-[13.5px] font-semibold">{review.name}</span>
                  <span className="ml-2 text-xs text-[#A7A59B]">{review.date}</span>
                </div>
                <div className="mb-1.5 mt-[5px] text-[11.5px] text-[#8A887E]">
                  {review.fit} · Size ordered: {review.size}
                </div>
                <div className="text-[13.5px] leading-[1.55] text-[#3D3B35]">{review.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ openFaq, setOpenFaq }: { openFaq: number; setOpenFaq: (index: number) => void }) {
  const faq = [
    {
      q: "What makes a Laitstyle piece one-of-one?",
      a: "Every item is a single, second-hand piece \u2014 hand-picked, cleaned, and authenticated. You are not buying one of thousands; you are buying the only one.",
    },
    {
      q: "How do you grade condition?",
      a: "Each item is inspected against a 4-point scale (Excellent, Good, Fair, and below) covering fabric, seams, hardware, and wear. The grade and any notable flaws are photographed and listed on this page.",
    },
    {
      q: "How does reserving work?",
      a: "Reserving a piece places a 15-minute hold so no one else can buy it while you check out. If you don\u2019t complete checkout, the hold releases automatically.",
    },
    {
      q: "What is your return policy?",
      a: "You have 7 days from delivery to return a piece in its original condition. Because stock is unique, returned items go straight back into the archive as available again.",
    },
    {
      q: "Will rehomed pieces come back?",
      a: "No. Every piece is one-of-one \u2014 once it has sold, it is gone for good and will never be restocked. If you love it, reserve it before someone else does.",
    },
  ];
  return (
    <section className="pb-5 pt-14 animate-[leemRise_.75s_cubic-bezier(.22,1,.36,1)_both]">
      <h2 className="m-0 mb-[26px] text-center font-serif text-[32px] font-medium italic">
        Before you reserve
      </h2>
      <div className="mx-auto flex max-w-[760px] flex-col gap-2.5">
        {faq.map((item, index) => (
          <Card className="overflow-hidden rounded-lg border-[#EAE8E0] bg-card p-0" key={item.q}>
            <button
              className="flex w-full items-center justify-between gap-4 bg-transparent px-[18px] py-4 text-left font-sans"
              onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              type="button"
            >
              <span className="text-sm font-medium">{item.q}</span>
              <span className="shrink-0 text-xl leading-none text-[#8A887E]">
                {openFaq === index ? "\u2212" : "+"}
              </span>
            </button>
            <div
              className={cn(
                "overflow-hidden transition-[max-height] duration-300",
                openFaq === index ? "max-h-[260px]" : "max-h-0",
              )}
            >
              <p className="m-0 px-[18px] pb-[18px] text-[13px] leading-[1.65] text-[#8A887E]">
                {item.a}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PdpLightbox({
  gallery,
  image,
  index,
  open,
  productName,
  setIndex,
  setOpen,
}: {
  gallery: string[];
  image: string;
  index: number;
  open: boolean;
  productName: string;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setOpen: (open: boolean) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#14120F]/95 p-6"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative flex w-full max-w-[min(880px,92vw)] flex-col items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[4/5] max-h-[80vh] w-full overflow-hidden rounded bg-[#14120F]">
          <Image alt={productName} className="object-contain" fill sizes="880px" src={image} />
        </div>
        <div className="flex items-center gap-5 text-white/85">
          <button
            aria-label="Previous image"
            className="flex size-11 items-center justify-center rounded-full bg-white/10"
            onClick={() => setIndex((value) => (value - 1 + gallery.length) % gallery.length)}
            type="button"
          >
            <ChevronLeft className="size-5 text-white" />
          </button>
          <span className="font-serif text-[15px] tracking-[.05em] tabular-nums">
            {index + 1} / {gallery.length}
          </span>
          <button
            aria-label="Next image"
            className="flex size-11 items-center justify-center rounded-full bg-white/10"
            onClick={() => setIndex((value) => (value + 1) % gallery.length)}
            type="button"
          >
            <ChevronRight className="size-5 text-white" />
          </button>
        </div>
      </div>
      <button
        aria-label="Close"
        className="fixed right-6 top-6 flex size-11 items-center justify-center rounded-full bg-white/15"
        onClick={() => setOpen(false)}
        type="button"
      >
        <X className="size-[22px] text-white" />
      </button>
    </div>
  );
}

function SizeGuide({
  measures,
  open,
  product,
  setOpen,
}: {
  measures: { label: string; value: string }[];
  open: boolean;
  product: PlpProduct;
  setOpen: (open: boolean) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#14120F]/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[86vh] w-[calc(100%-40px)] max-w-[520px] overflow-y-auto rounded-[10px] bg-background px-[30px] py-[30px] pb-[34px] shadow-[0_30px_80px_rgba(0,0,0,.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1.5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[.3em] text-[#8A887E]">
              Measurements &amp; fit
            </div>
            <h3 className="m-0 font-serif text-[28px] font-medium italic">How this one measures</h3>
          </div>
          <button
            aria-label="Close"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-full border border-border bg-card"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="size-[18px]" />
          </button>
        </div>
        <p className="my-3.5 mb-5 text-[13.5px] leading-[1.65] text-muted-foreground">
          A size label on a thrifted piece can&rsquo;t be trusted &mdash; so we don&rsquo;t ask you
          to. Every measurement below is taken by hand, laid flat, in centimetres. Compare against a
          piece you already own and love.
        </p>
        <div className="mb-[18px] rounded-lg border border-[#EAE8E0] bg-card px-[18px] py-1.5">
          <MeasurementRows rows={measures} />
        </div>
        <Alert className="flex gap-3 rounded-lg border-chip-border bg-chip-bg px-4 py-3.5">
          <Info className="mt-px size-[18px] shrink-0 text-accent" />
          <AlertDescription className="text-[12.5px] leading-[1.6] text-[#4A5540]">
            Labelled size <strong>{product.size}</strong>, but fit is what these numbers say &mdash;
            not the tag. Between sizes? On a one-of-one, size up for a relaxed drape.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function HoldDrawer({
  heldProducts,
  open,
  recommended,
  setExtraHolds,
  setOpen,
  setReserved,
}: {
  currentProduct: PlpProduct;
  heldProducts: { product: PlpProduct; secondsLeft: number; current: boolean }[];
  open: boolean;
  recommended: PlpProduct[];
  reserved: boolean;
  setExtraHolds: React.Dispatch<React.SetStateAction<HeldItem[]>>;
  setOpen: (open: boolean) => void;
  setReserved: (reserved: boolean) => void;
}) {
  if (!open) return null;
  const total = heldProducts.reduce((sum, item) => sum + item.product.price, 0);
  return (
    <aside className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-[760px] translate-x-0 shadow-[-24px_0_60px_rgba(0,0,0,.14)] max-md:max-w-full">
      <div className="h-full w-[220px] shrink-0 overflow-y-auto bg-muted px-3.5 py-[18px] max-md:hidden">
        <div className="mb-3.5 text-[13px] font-semibold">You might also hold</div>
        <div className="flex flex-col gap-4">
          {recommended.slice(0, 2).map((item) => (
            <Card className="overflow-hidden rounded-xl border-input bg-card p-0" key={item.id}>
              <ProductImageLink product={item} aspect="aspect-[1/1.1]" />
              <div className="p-2.5">
                <div className="mb-[3px] truncate text-[12.5px]">{item.name}</div>
                <div className="mb-[9px] text-[12.5px] font-semibold">{naira(item.price)}</div>
                <button
                  className="h-[34px] w-full rounded-full border border-[#DAD8CF] bg-card text-xs shadow-sm"
                  onClick={() =>
                    setExtraHolds((current) =>
                      current.some((held) => held.id === item.id)
                        ? current
                        : [...current, { id: item.id, secondsLeft: 900 }],
                    )
                  }
                  type="button"
                >
                  Quick hold
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="flex h-full flex-1 flex-col bg-card">
        <div className="flex items-center justify-between px-[22px] pb-2.5 pt-5">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-medium italic">On hold for you</span>
            <span className="text-sm text-[#8A887E]">{heldProducts.length}</span>
          </div>
          <button
            aria-label="Close cart"
            className="flex p-1"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="size-[22px]" />
          </button>
        </div>
        <div className="px-[22px] pb-2">
          <div className="inline-flex items-center gap-2 text-[12.5px] text-[#4A5540]">
            <Truck className="size-[15px]" />
            Free delivery on this bag
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-[22px] py-0.5">
          {heldProducts.map((held) => (
            <div className="flex gap-3.5 border-b border-[#EFEDE7] py-4" key={held.product.id}>
              <Link
                className="relative block h-[90px] w-[74px] shrink-0 overflow-hidden rounded-[10px] bg-[linear-gradient(160deg,#E4E5DE,#D3D5CB)]"
                href={pdpHref(held.product.id)}
              >
                <Image
                  alt={held.product.name}
                  className="object-cover"
                  fill
                  sizes="74px"
                  src={held.product.image}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2.5">
                  <Link className="text-sm font-medium" href={pdpHref(held.product.id)}>
                    {held.product.name}
                  </Link>
                  <span className="whitespace-nowrap text-sm font-semibold">
                    {naira(held.product.price)}
                  </span>
                </div>
                <div className="mb-2.5 mt-1 text-xs text-[#8A887E]">
                  Size {held.product.size} · {held.product.color} · {held.product.condition}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-chip-border bg-chip-bg px-2.5 py-1 text-[11px] tabular-nums text-[#4A5540]">
                    Held {formatSeconds(held.secondsLeft)}
                  </span>
                  <button
                    className="text-[12.5px] text-[#8A887E] underline underline-offset-2"
                    onClick={() =>
                      held.current
                        ? setReserved(false)
                        : setExtraHolds((current) =>
                            current.filter((item) => item.id !== held.product.id),
                          )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#EAE8E0] px-[22px] pb-5 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-[22px] italic">Total</span>
            <span className="text-xl font-semibold">{naira(total)}</span>
          </div>
          <div className="mt-[3px] flex justify-between text-[11.5px] text-[#8A887E]">
            <span>(incl. VAT)</span>
            <span>Free delivery · 7-day returns</span>
          </div>
          <Button
            className="mt-3.5 h-[52px] w-full rounded-full text-[14.5px] font-semibold"
            render={<Link href="/checkout" />}
          >
            Checkout securely
          </Button>
          <Link
            className="mt-0.5 flex h-10 items-center justify-center text-[12.5px] text-[#8A887E] underline underline-offset-2"
            href="/checkout"
          >
            View full bag
          </Link>
        </div>
      </div>
    </aside>
  );
}

function ProductImageLink({
  aspect,
  product,
  rounded = false,
}: {
  aspect: string;
  product: PlpProduct;
  rounded?: boolean;
}) {
  return (
    <Link
      className={cn(
        "relative block overflow-hidden bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]",
        aspect,
        rounded ? "rounded-md" : "",
      )}
      href={pdpHref(product.id)}
    >
      <Image alt={product.name} className="object-cover" fill sizes="220px" src={product.image} />
      <span className="absolute left-2.5 top-2.5 rounded-sm bg-background/85 px-[7px] py-0.5 font-serif text-[11px] tabular-nums">
        &#8470;&nbsp;{accession(product)}
      </span>
    </Link>
  );
}

function MeasurementRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <div className="flex items-baseline gap-3 border-t border-[#EAE8E0] py-3" key={row.label}>
          <span className="text-sm text-muted-foreground">{row.label}</span>
          <span className="flex-1 translate-y-[-3px] border-b border-dotted border-[#CFCDC3]" />
          <span className="font-serif text-base tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function ClockIcon() {
  return (
    <span className="flex size-[18px] items-center justify-center rounded-full border border-accent text-accent" />
  );
}

function accession(product: PlpProduct) {
  return String(product.rank + 1).padStart(4, "0");
}

function formatSeconds(sec = 0) {
  const value = Math.max(0, sec);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function describe(product: PlpProduct) {
  const category = product.category.replace(/s$/, "").toLowerCase();
  const condLine =
    {
      Excellent:
        "In excellent condition \u2014 inspected, professionally cleaned, and showing no notable wear.",
      Good: "In good pre-loved condition \u2014 cleaned and quality-checked, with only light, honest signs of wear.",
      Fair: "In fair, well-worn condition \u2014 character intact, graded honestly so there are no surprises.",
    }[product.condition] || "";
  return `A one-of-one ${product.color.toLowerCase()} ${category} from the ${product.brand} line, hand-picked for its ${product.era.toLowerCase()} character. ${condLine} Because it is second-hand and unique, there is exactly one \u2014 when it sells, it is gone for good.`;
}

function measureRows(product: PlpProduct) {
  const j = (base: number) => base + ((product.rank % 3) - 1);
  if (product.category === "Accessories")
    return [
      { label: "Length", value: `${j(178)} cm` },
      { label: "Width", value: `${j(27)} cm` },
      { label: "Weight", value: `${140 + product.rank * 3} g` },
    ];
  if (product.category === "Trousers" || product.category === "Skirts") {
    const waist =
      ({ XS: 36, S: 38, M: 41, L: 44, XL: 47, OS: 40 } as Record<string, number>)[product.size] ??
      41;
    return [
      { label: "Waist, flat", value: `${j(waist)} cm` },
      { label: "Hip, flat", value: `${j(waist + 9)} cm` },
      {
        label: product.category === "Skirts" ? "Length" : "Inseam",
        value: `${j(product.category === "Skirts" ? 58 : 74)} cm`,
      },
      { label: "Front rise", value: `${j(28)} cm` },
    ];
  }
  const chest =
    ({ XS: 47, S: 50, M: 53, L: 56, XL: 59, OS: 53 } as Record<string, number>)[product.size] ?? 53;
  const length =
    ({ XS: 63, S: 66, M: 69, L: 72, XL: 75, OS: 71 } as Record<string, number>)[product.size] ?? 69;
  const shoulder =
    ({ XS: 40, S: 42, M: 44, L: 46, XL: 48, OS: 44 } as Record<string, number>)[product.size] ?? 44;
  const sleeve =
    ({ XS: 59, S: 61, M: 63, L: 65, XL: 67, OS: 62 } as Record<string, number>)[product.size] ?? 63;
  return [
    { label: "Pit to pit", value: `${j(chest)} cm` },
    { label: "Length, back", value: `${j(length)} cm` },
    { label: "Shoulder", value: `${j(shoulder)} cm` },
    { label: "Sleeve", value: `${j(sleeve)} cm` },
  ];
}

function flawNote(product: PlpProduct) {
  return (
    {
      Excellent:
        "Barely lived in. Under raking light the only trace of a past life is the faintest softening at the cuffs \u2014 invisible on the body. Shown up close so the honesty is yours to check.",
      Good: "Worn, and better for it. Light pilling near one seam and a gentle fade at the hem, both photographed here. Structurally sound: no holes, no odour, nothing hidden.",
      Fair: "A piece with a history it doesn\u2019t hide. Visible wear at the stress points and one small mend, all photographed in full. Priced for character, graded so nothing surprises you.",
    }[product.condition] ||
    "Graded honestly and photographed close, so what you see is what arrives."
  );
}

function stockCopy(product: PlpProduct, reserved: boolean) {
  if (reserved)
    return {
      dot: "#7C8C63",
      pulse: false,
      color: "#7C8C63",
      label: "Reserved \u2014 held in your cart",
    };
  if (product.state === "lastone")
    return {
      dot: "#C88A3A",
      pulse: true,
      color: "#B0682E",
      label: "The only one \u2014 and it\u2019s here now",
    };
  if (product.state === "resOthers")
    return {
      dot: "#B7B3A6",
      pulse: false,
      color: "#8A887E",
      label: `In someone\u2019s cart \u2014 frees up in ~${product.minutes || 5}m`,
    };
  if (product.state === "sold")
    return {
      dot: "#C6584F",
      pulse: false,
      color: "#A7A59B",
      label: "Rehomed \u2014 one-of-one, gone for good",
    };
  return { dot: "#B7B3A6", pulse: false, color: "#8A887E", label: "Available \u2014 the only one" };
}

function primaryLabel(product: PlpProduct, reserved: boolean, secondsLeft: number) {
  if (reserved) return `Reserved · ${formatSeconds(secondsLeft)}`;
  if (product.state === "sold") return "Rehomed · find something similar";
  if (product.state === "resOthers") return "Reserved by another shopper";
  return "Reserve this piece";
}

function pairedProducts(product: PlpProduct) {
  const others = plpItems.filter((item) => item.id !== product.id);
  const primary = others
    .filter(
      (item) =>
        item.category !== product.category &&
        (item.state === "available" || item.state === "lastone"),
    )
    .slice(0, 4);
  const fill =
    primary.length < 4
      ? others.filter((item) => !primary.includes(item)).slice(0, 4 - primary.length)
      : [];
  return [...primary, ...fill].slice(0, 4);
}

function shelfProducts(product: PlpProduct) {
  const others = plpItems.filter((item) => item.id !== product.id);
  const shelf = others.filter((item) => item.category === product.category);
  return (
    shelf.length >= 5
      ? shelf
      : [...shelf, ...others.filter((item) => item.category !== product.category)]
  ).slice(0, 5);
}

function heldList(
  product: PlpProduct,
  reserved: boolean,
  secondsLeft: number,
  extraHolds: HeldItem[],
) {
  const list: { product: PlpProduct; secondsLeft: number; current: boolean }[] = [];
  if (reserved) list.push({ product, secondsLeft, current: true });
  extraHolds.forEach((held) => {
    const extra = plpItems.find((item) => item.id === held.id);
    if (extra && extra.id !== product.id)
      list.push({ product: extra, secondsLeft: held.secondsLeft, current: false });
  });
  return list;
}
