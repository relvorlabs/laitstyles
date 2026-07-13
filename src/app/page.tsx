"use client";

import { ArrowRight, Clock, Heart, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatHoldTime, useShop } from "@/components/shop/shop-provider";
import {
  categories,
  feedItems,
  journal,
  naira,
  type Product,
  pdpHref,
  reducedItems,
} from "@/lib/catalogue";

type FeedFilter = "all" | "available" | "held" | "rehomed";

const feedFilters: { label: string; value: FeedFilter }[] = [
  { label: "All", value: "all" },
  { label: "Available now", value: "available" },
  { label: "Held", value: "held" },
  { label: "Rehomed", value: "rehomed" },
];

export default function HomePage() {
  const { heldItems, reserve, release, isHeld, secondsFor } = useShop();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      feedItems.filter((product) => {
        const held = isHeld(product.id);
        if (filter === "available") {
          return !held && (product.state === "available" || product.state === "lastone");
        }
        if (filter === "held") {
          return held || product.state === "resOthers";
        }
        if (filter === "rehomed") return product.state === "sold";
        return true;
      }),
    [filter, isHeld],
  );

  const activeHeld = heldItems.filter((item) => item.secondsLeft > 0);
  const soonest = activeHeld.length ? Math.min(...activeHeld.map((item) => item.secondsLeft)) : 0;

  return (
    <main className="flex-1 overflow-hidden">
      <section className="mx-auto grid w-full max-w-[1240px] grid-cols-[1.04fr_.96fr] items-stretch gap-5 px-6 pb-14 pt-7 max-md:grid-cols-1 max-sm:px-4">
        <div className="flex min-h-[610px] flex-col justify-between rounded-[16px] bg-[#E9E8E1] px-10 py-11 max-sm:min-h-[520px] max-sm:px-6 max-sm:py-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D6DAC8] bg-[#F2F4EA] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#4A5540]">
              <span className="size-1.5 animate-[leemPulse_1.8s_ease-in-out_infinite] rounded-full bg-[#7C8C63]" />
              Live one-of-one drop
            </div>
            <h1 className="max-w-[650px] text-balance font-serif text-[72px] font-medium italic leading-[.96] tracking-[-.025em] max-lg:text-[62px] max-sm:text-[48px]">
              Clothes with a life before yours.
            </h1>
            <p className="mt-6 max-w-[520px] text-[15px] leading-[1.75] text-[#57554E]">
              Honestly graded second-hand fashion from Lagos. Every piece appears once, stays once
              and leaves when someone gives it a second life.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-[54px] items-center gap-2 rounded-full bg-[#1B1A17] px-6 text-[14.5px] font-semibold text-white"
              href="/shop?sort=newest"
            >
              Shop the live drop
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              className="inline-flex h-[54px] items-center rounded-full border border-[#CFCDBF] bg-white/60 px-6 text-[14px] font-semibold"
              href="#how-it-works"
            >
              How one-of-one works
            </Link>
          </div>
        </div>

        <Link
          className="group relative min-h-[610px] overflow-hidden rounded-[16px] bg-[#D8D9D1] max-md:min-h-[560px] max-sm:min-h-[480px]"
          href={pdpHref(feedItems[0].id)}
        >
          <Image
            alt={feedItems[0].name}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 48vw"
            src={feedItems[0].image}
          />
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(20,19,16,.82))] px-7 pb-7 pt-24 text-white">
            <div className="mb-2 text-[10.5px] uppercase tracking-[.22em] text-white/75">
              Featured one-of-one
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-[31px] italic">{feedItems[0].name}</h2>
                <p className="mt-1 text-[12.5px] text-white/75">
                  Size {feedItems[0].size} · {feedItems[0].condition}
                </p>
              </div>
              <span className="shrink-0 font-serif text-[24px]">{naira(feedItems[0].price)}</span>
            </div>
          </div>
        </Link>
      </section>

      <section className="border-y border-border bg-white/45" id="how-it-works">
        <div className="mx-auto grid max-w-[1240px] grid-cols-3 gap-8 px-6 py-7 max-md:grid-cols-1 max-md:gap-5 max-sm:px-4">
          <TrustItem
            icon={<Clock aria-hidden="true" />}
            title="15-minute holds"
            text="Reserve without racing through checkout."
          />
          <TrustItem
            icon={<ShieldCheck aria-hidden="true" />}
            title="Honestly graded"
            text="Condition and measurements are shown before purchase."
          />
          <TrustItem
            icon={<Truck aria-hidden="true" />}
            title="Nigeria-wide delivery"
            text="Lagos and interstate options at checkout."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-6 py-16 max-sm:px-4" id="justin">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.26em] text-[#7C8C63]">
              Just in
            </div>
            <h2 className="font-serif text-[42px] font-medium italic max-sm:text-[36px]">
              The live rail
            </h2>
            <p className="mt-2 max-w-[600px] text-[13.5px] leading-[1.6] text-[#6E6C64]">
              Availability is visible at a glance. When a hold expires, the piece returns to the
              rail.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#7C8C63]"
            href="/shop?sort=newest"
          >
            View the full drop <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        {activeHeld.length ? (
          <Link
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#D6DAC8] bg-[#F2F4EA] px-4 py-3 text-[12.5px] text-[#4A5540]"
            href="/cart"
          >
            <span>
              {activeHeld.length} {activeHeld.length === 1 ? "piece is" : "pieces are"} reserved to
              you.
            </span>
            <span className="font-semibold tabular-nums">
              Next release {formatHoldTime(soonest)} · Review bag
            </span>
          </Link>
        ) : null}

        <div className="mb-7 flex flex-wrap gap-2">
          {feedFilters.map((item) => (
            <button
              aria-pressed={filter === item.value}
              className={
                filter === item.value
                  ? "h-9 rounded-full bg-[#1B1A17] px-4 text-[12.5px] font-semibold text-white"
                  : "h-9 rounded-full border border-border bg-white px-4 text-[12.5px] font-semibold text-[#57554E]"
              }
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-4 gap-x-4 gap-y-9 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-x-3">
            {filtered.map((product) => (
              <HomeProductCard
                held={isHeld(product.id)}
                key={product.id}
                notified={Boolean(notified[product.id])}
                onNotify={() => setNotified((current) => ({ ...current, [product.id]: true }))}
                onRelease={() => release(product.id)}
                onReserve={() => reserve(product)}
                onWishlist={() =>
                  setWishlist((current) => ({ ...current, [product.id]: !current[product.id] }))
                }
                product={product}
                secondsLeft={secondsFor(product.id)}
                wished={Boolean(wishlist[product.id])}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-border bg-white text-center">
            <Sparkles aria-hidden="true" className="size-7 text-[#7C8C63]" />
            <h3 className="mt-4 font-serif text-[28px]">Nothing on this rail right now</h3>
            <button
              className="mt-4 h-10 rounded-full bg-primary px-5 text-[12.5px] font-semibold text-primary-foreground"
              onClick={() => setFilter("all")}
              type="button"
            >
              Show every state
            </button>
          </div>
        )}
      </section>

      <section className="bg-[#ECEBE6] py-16">
        <div className="mx-auto max-w-[1240px] px-6 max-sm:px-4">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.26em] text-[#7C8C63]">
                Shop by rail
              </div>
              <h2 className="font-serif text-[40px] font-medium italic">Find your section</h2>
            </div>
            <Link className="text-[13px] font-semibold text-[#7C8C63]" href="/shop">
              All pieces
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-3 max-sm:grid-cols-2">
            {categories.map((category) => (
              <Link
                className="group relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted"
                href={`/shop?category=${encodeURIComponent(category.name.toLowerCase())}`}
                key={category.name}
              >
                <Image
                  alt={category.name}
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  src={category.image}
                />
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(20,19,16,.78))] px-4 pb-4 pt-16 text-white">
                  <div className="font-serif text-[23px] italic">{category.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-white/72">{category.count} pieces</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-16 max-sm:px-4">
        <div className="grid grid-cols-[.85fr_1.15fr] items-center gap-12 max-md:grid-cols-1">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.26em] text-[#7C8C63]">
              A fairer second life
            </div>
            <h2 className="font-serif text-[44px] font-medium italic leading-[1.05]">
              The condition is part of the story.
            </h2>
            <p className="mt-5 text-[14px] leading-[1.75] text-[#57554E]">
              We photograph wear, list measurements and grade each piece without pretending it is
              new. Better information means fewer surprises and fewer returns.
            </p>
            <Link
              className="mt-6 inline-flex h-12 items-center rounded-full border border-primary px-6 text-[13.5px] font-semibold"
              href="/shop?sort=newest"
            >
              See how pieces are graded
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            <ConditionCard label="Excellent" text="Very light or no visible wear." />
            <ConditionCard label="Good" text="Minor signs of a previous life." />
            <ConditionCard label="Fair" text="Visible wear, fully documented." />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white/55 py-16">
        <div className="mx-auto max-w-[1240px] px-6 max-sm:px-4">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.26em] text-[#7C8C63]">
                Price reduced
              </div>
              <h2 className="font-serif text-[40px] font-medium italic">
                Still waiting for a wardrobe
              </h2>
            </div>
            <Link className="text-[13px] font-semibold text-[#7C8C63]" href="/shop?sort=reduced">
              View reductions
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-3 max-sm:grid-cols-2">
            {reducedItems.map((item, index) => (
              <Link href={`/shop?q=${encodeURIComponent(item.name)}`} key={item.name}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted">
                  <Image
                    alt={item.name}
                    className="object-cover"
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    src={item.image}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10.5px] font-semibold text-[#8A362F]">
                    {item.discount}
                  </span>
                </div>
                <h3 className="mt-3 line-clamp-2 text-[13.5px] font-medium">{item.name}</h3>
                <div className="mt-1 flex items-center gap-2 text-[12px]">
                  <span className="font-semibold">{item.price}</span>
                  <span className="text-[#A7A59B] line-through">{item.original}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-16 max-sm:px-4" id="journal">
        <div className="mb-7">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.26em] text-[#7C8C63]">
            Laitstyle journal
          </div>
          <h2 className="font-serif text-[40px] font-medium italic">Wear, care and second lives</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
          {journal.map((entry) => (
            <article key={entry.title}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-muted">
                <Image
                  alt={entry.title}
                  className="object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  src={entry.image}
                />
              </div>
              <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-[.18em] text-[#7C8C63]">
                {entry.kicker}
              </div>
              <h3 className="mt-1 font-serif text-[24px] leading-[1.2]">{entry.title}</h3>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function HomeProductCard({
  held,
  notified,
  onNotify,
  onRelease,
  onReserve,
  onWishlist,
  product,
  secondsLeft,
  wished,
}: {
  held: boolean;
  notified: boolean;
  onNotify: () => void;
  onRelease: () => void;
  onReserve: () => void;
  onWishlist: () => void;
  product: Product;
  secondsLeft: number;
  wished: boolean;
}) {
  const unavailable = product.state === "sold" || product.state === "resOthers";
  const expired = held && secondsLeft <= 0;
  return (
    <article>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted">
        <Link href={pdpHref(product.id)}>
          <Image
            alt={product.name}
            className={unavailable ? "object-cover opacity-60 grayscale" : "object-cover"}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            src={product.image}
          />
        </Link>
        <button
          aria-label={
            wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
          }
          aria-pressed={wished}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/92"
          onClick={onWishlist}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={wished ? "size-4 fill-[#B04A45] text-[#B04A45]" : "size-4"}
          />
        </button>
        <ProductStatus held={held} product={product} secondsLeft={secondsLeft} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="line-clamp-2 text-[14px] font-medium" href={pdpHref(product.id)}>
            {product.name}
          </Link>
          <p className="mt-1 text-[12px] text-[#8A887E]">
            Size {product.size} · {product.condition}
          </p>
        </div>
        <span className="shrink-0 text-[13.5px] font-semibold">{naira(product.price)}</span>
      </div>
      {held ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={
              expired
                ? "text-[11.5px] font-semibold text-[#8A362F]"
                : "text-[11.5px] font-semibold text-[#4A5540]"
            }
          >
            {expired ? "Hold expired" : `Held · ${formatHoldTime(secondsLeft)}`}
          </span>
          <button
            className="text-[11.5px] text-[#8A887E] underline underline-offset-2"
            onClick={expired ? onReserve : onRelease}
            type="button"
          >
            {expired ? "Re-hold" : "Release"}
          </button>
        </div>
      ) : unavailable ? (
        <button
          className="mt-3 h-9 w-full rounded-full border border-border bg-white text-[12px] font-semibold"
          disabled={notified}
          onClick={onNotify}
          type="button"
        >
          {notified
            ? "Notification set"
            : product.state === "sold"
              ? "Find similar"
              : "Notify me if released"}
        </button>
      ) : (
        <button
          className="mt-3 h-9 w-full rounded-full border border-primary text-[12px] font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
          onClick={onReserve}
          type="button"
        >
          {product.state === "lastone" ? "Reserve the last one" : "Quick reserve"}
        </button>
      )}
    </article>
  );
}

function ProductStatus({
  held,
  product,
  secondsLeft,
}: {
  held: boolean;
  product: Product;
  secondsLeft: number;
}) {
  let label = "Available";
  let tone = "border-[#D6DAC8] bg-[#F2F4EA] text-[#4A5540]";
  if (held) {
    label = secondsLeft > 0 ? `Held ${formatHoldTime(secondsLeft)}` : "Hold expired";
    tone =
      secondsLeft > 0
        ? "border-[#D6DAC8] bg-[#F2F4EA] text-[#4A5540]"
        : "border-[#E4C4BF] bg-[#FBF0EE] text-[#8A362F]";
  } else if (product.state === "lastone") {
    label = "Last one";
    tone = "border-[#E8D7A6] bg-[#FBF6E8] text-[#8A7434]";
  } else if (product.state === "resOthers") {
    label = "Held by someone";
    tone = "border-[#E8D7A6] bg-[#FBF6E8] text-[#8A7434]";
  } else if (product.state === "sold") {
    label = "Rehomed";
    tone = "border-[#DAD8CF] bg-[#EDECE6] text-[#6E6C64]";
  }
  return (
    <span
      className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

function TrustItem({ icon, text, title }: { icon: React.ReactNode; text: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
        {icon}
      </span>
      <div>
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[12px] text-[#8A887E]">{text}</div>
      </div>
    </div>
  );
}

function ConditionCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[16px] border border-border bg-white p-5">
      <span className="mb-4 flex size-9 items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
        <ShieldCheck aria-hidden="true" className="size-4" />
      </span>
      <h3 className="font-serif text-[24px]">{label}</h3>
      <p className="mt-2 text-[12.5px] leading-[1.55] text-[#6E6C64]">{text}</p>
    </div>
  );
}
