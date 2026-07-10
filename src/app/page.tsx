"use client";

import {
  AlertTriangle,
  Clock,
  Heart,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Timer,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  categories,
  feedItems,
  feedPool,
  journal,
  naira,
  type Product,
  reducedItems,
} from "@/lib/catalogue";
import { cn } from "@/lib/utils";

type FeedState = "default" | "loading" | "error" | "empty";

const filters = ["All", "Women", "Men", "Accessories", "Under \u20A610k", "Vintage"];
const feedTabs: { label: string; value: FeedState }[] = [
  { label: "Live", value: "default" },
  { label: "Loading", value: "loading" },
  { label: "Error", value: "error" },
  { label: "Empty", value: "empty" },
];

function fmt(sec: number) {
  const value = Math.max(0, sec);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function statusFor(product: Product) {
  if (product.state === "lastone") {
    return { label: "1 left · last one", tone: "text-[#B0682E]", dot: "bg-[#C88A3A]" };
  }
  if (product.state === "resYou") {
    return {
      label: `Held · ${fmt(product.secondsLeft ?? 0)}`,
      tone: "text-[#4A5540]",
      dot: "bg-accent",
    };
  }
  if (product.state === "resOthers") {
    return {
      label: `Frees up in ~${product.minutes ?? 7}m`,
      tone: "text-[#8A887E]",
      dot: "bg-[#B7B3A6]",
    };
  }
  if (product.state === "sold") {
    return { label: "Sold", tone: "text-[#A7A59B]", dot: "bg-[#C6584F]" };
  }

  return { label: "Available", tone: "text-[#8A887E]", dot: "bg-[#B7B3A6]" };
}

function ProductCard({
  product,
  notified,
  wished,
  onNotify,
  onRelease,
  onReserve,
  onWish,
}: {
  product: Product;
  notified: boolean;
  wished: boolean;
  onNotify: () => void;
  onRelease: () => void;
  onReserve: () => void;
  onWish: () => void;
}) {
  const status = statusFor(product);
  const hasOriginal = product.state !== "sold";
  const discount = Math.round((1 - product.price / product.original) * 100);
  const justDropped = (product.dropped ?? 99) < 4;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[14px] border bg-card p-0",
        product.state === "resYou" && "border-[1.5px] border-accent",
        product.state === "resOthers" && "border-[#EAE8E0] bg-[#F4F3EF]",
        justDropped &&
          "animate-[leemRise_.45s_cubic-bezier(.33,1,.68,1)] shadow-[0_0_0_2px_var(--accent),0_18px_40px_rgba(124,140,99,.20)]",
      )}
    >
      <div className="relative flex aspect-[1/1.12] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]">
        {justDropped ? (
          <Badge className="absolute left-3 top-3 rounded-full bg-accent px-[11px] py-1 text-[10.5px] font-semibold text-white">
            Just in
          </Badge>
        ) : product.state === "resYou" ? (
          <Badge className="absolute left-3 top-3 rounded-full border border-chip-border bg-chip-bg px-[11px] py-1 text-[10.5px] font-semibold text-[#4A5540]">
            In your cart
          </Badge>
        ) : product.state === "lastone" ? (
          <Badge className="absolute left-3 top-3 rounded-full border border-[#EAD6BE] bg-[#FBF1E6] px-[11px] py-1 text-[10.5px] font-semibold text-[#B0682E]">
            Last one
          </Badge>
        ) : null}
        <button
          aria-label="Save"
          className="absolute right-3 top-3 z-10 flex size-[34px] items-center justify-center rounded-full bg-white/90"
          onClick={onWish}
          type="button"
        >
          <Heart fill={wished ? "#B04A45" : "none"} />
        </button>
        <Link href="#" className="absolute inset-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 232px, 50vw"
            className={
              product.state === "sold" || product.state === "resOthers"
                ? "object-cover opacity-55 grayscale"
                : "object-cover"
            }
          />
        </Link>
        {product.state === "sold" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/18">
            <span className="rounded-full bg-primary/70 px-[18px] py-[7px] text-[12px] font-semibold tracking-[.28em] text-primary-foreground">
              SOLD
            </span>
          </div>
        ) : null}
        {product.state === "resOthers" ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-input bg-white/92 px-3 py-[5px] text-[11px] font-medium text-muted-foreground">
              <LockKeyhole /> In someone&apos;s cart
            </span>
          </div>
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-[9px] p-[13px] pb-[15px]">
        <div>
          <Link href="#" className="mb-[5px] block truncate text-[13.5px]">
            {product.name}
          </Link>
          <div className="flex items-baseline gap-[7px]">
            <span
              className={cn(
                "text-[14px] font-semibold",
                product.state === "sold" && "text-[#A7A59B]",
              )}
            >
              {naira(product.price)}
            </span>
            {hasOriginal ? (
              <>
                <span className="text-[12px] text-[#A7A59B] line-through">
                  {naira(product.original)}
                </span>
                <span className="text-[11.5px] font-semibold text-accent">-{discount}%</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="rounded-full px-[9px] py-[3px] text-[11px] font-normal text-muted-foreground"
          >
            {product.size} · {product.color}
          </Badge>
          <Badge className="rounded-full border border-chip-border bg-chip-bg px-[9px] py-[3px] text-[11px] font-normal text-[#4A5540]">
            <span className="size-1.5 rounded-full bg-accent" />
            {product.condition}
          </Badge>
        </div>
        <div className="flex items-center gap-[7px]">
          <span className={cn("inline-block size-2 rounded-full", status.dot)} />
          <span className={cn("text-[12px] font-medium tabular-nums", status.tone)}>
            {status.label}
          </span>
        </div>
        {product.state === "resYou" ? (
          <div className="flex flex-col gap-2">
            <Button className="h-[42px] w-full rounded-full text-[13px] font-semibold">
              Checkout now
            </Button>
            <button
              className="self-center text-[12px] text-[#8A887E] underline underline-offset-2"
              onClick={onRelease}
              type="button"
            >
              Release hold
            </button>
          </div>
        ) : product.state === "resOthers" ? (
          <Button
            variant="outline"
            className={cn(
              "h-[42px] w-full rounded-full text-[13px] font-medium",
              notified && "border-chip-border bg-chip-bg text-[#4A5540]",
            )}
            onClick={onNotify}
          >
            {notified ? "We'll let you know" : "Notify me if it frees up"}
          </Button>
        ) : product.state === "sold" ? (
          <Button
            variant="outline"
            className="h-[42px] w-full rounded-full text-[13px] font-medium"
          >
            Find something similar
          </Button>
        ) : (
          <Button
            className="h-[42px] w-full rounded-full text-[13px] font-semibold"
            onClick={onReserve}
          >
            Reserve · hold 15 min
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingFeed() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-[18px]">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden rounded-[14px] border-[#EEECE5] bg-card p-0">
          <Skeleton className="aspect-[1/1.12] rounded-none bg-[linear-gradient(90deg,#ECEBE5_0%,#F3F5EC_50%,#ECEBE5_100%)] bg-[length:640px_100%]" />
          <CardContent className="flex flex-col gap-2.5 p-[13px]">
            <Skeleton className="h-[11px] w-[78%] rounded-full" />
            <Skeleton className="h-[11px] w-[42%] rounded-full" />
            <Skeleton className="mt-1 h-9 w-full rounded-full bg-[linear-gradient(90deg,#EEF1E6,#F5F7EF,#EEF1E6)]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorFeed({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert className="flex flex-col items-center gap-3.5 rounded-[14px] border-[#EAE8E0] bg-card px-[30px] py-12 text-center">
      <div className="flex size-[60px] items-center justify-center rounded-full bg-[#F6E9E4]">
        <AlertTriangle className="text-[#B04A45]" />
      </div>
      <div className="font-serif text-[24px]">Couldn&apos;t load the latest drops</div>
      <AlertDescription className="max-w-[340px] text-[13.5px] leading-[1.55] text-[#8A887E]">
        The live rail lost connection. Your held pieces are safe — nothing was released.
      </AlertDescription>
      <Button className="mt-1 h-[46px] rounded-full px-6 text-[14px] font-medium" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Try again
      </Button>
    </Alert>
  );
}

function EmptyFeed({ nextDrop }: { nextDrop: number }) {
  return (
    <Empty className="rounded-[14px] border border-dashed border-chip-border bg-[#F7F9F2] px-[30px] py-14">
      <EmptyHeader>
        <EmptyMedia className="mb-0 flex size-16 origin-top items-center justify-center rounded-full bg-[#EAF0DE] text-accent animate-[leemHook_2.4s_ease-in-out_infinite_alternate]">
          <ShoppingBag />
        </EmptyMedia>
        <EmptyTitle className="font-serif text-[26px] font-normal">
          The first drop lands soon
        </EmptyTitle>
        <EmptyDescription className="max-w-[360px] text-[13.5px] leading-[1.6] text-muted-foreground">
          We&apos;re grading and photographing the opening rail right now. Every piece is one-of-one
          — be first in line when it goes live.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="inline-flex items-center gap-[9px] rounded-full border border-chip-border bg-card px-4 py-[9px]">
          <span className="size-2 animate-[leemPulse_1.6s_ease-in-out_infinite] rounded-full bg-accent" />
          <span className="text-[12.5px] text-muted-foreground">
            First drop in <strong className="text-foreground">{fmt(nextDrop)}</strong>
          </span>
        </div>
        <Button className="mt-1.5 h-[46px] rounded-full px-6 text-[14px] font-medium">
          Notify me when it drops
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export default function Home() {
  const [items, setItems] = useState<Product[]>(feedItems);
  const [feedState, setFeedState] = useState<FeedState>("default");
  const [activeFilter, setActiveFilter] = useState("All");
  const [nextDrop, setNextDrop] = useState(272);
  const [wished, setWished] = useState<Record<string, boolean>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [holdsDismissed, setHoldsDismissed] = useState(false);
  const tickRef = useRef(0);
  const poolIdxRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      setItems((current) => {
        let next = current.map((item) => {
          const updated = {
            ...item,
            dropped: (item.dropped ?? 99) < 90 ? (item.dropped ?? 0) + 1 : item.dropped,
          };

          if (updated.state === "resYou") {
            const secondsLeft = (updated.secondsLeft ?? 0) - 1;
            if (secondsLeft <= 0) {
              return { ...updated, state: "available" as const, secondsLeft: undefined };
            }
            return { ...updated, secondsLeft };
          }

          if (tick % 6 === 0 && updated.state === "resOthers") {
            return { ...updated, minutes: Math.max(1, (updated.minutes ?? 5) - 1) };
          }

          return updated;
        });

        if (feedState === "default" && tick % 7 === 0) {
          const candidates = next.filter(
            (item) => item.state === "available" || item.state === "lastone",
          );
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target) {
            next = next.map((item) =>
              item.id === target.id
                ? {
                    ...item,
                    state: "resOthers" as const,
                    minutes: 5 + Math.floor(Math.random() * 5),
                  }
                : item,
            );
          }
        }

        if (feedState === "default" && tick % 11 === 0) {
          const candidates = next.filter((item) => item.state === "resOthers");
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target) {
            next = next.map((item) =>
              item.id === target.id ? { ...item, state: "sold" as const } : item,
            );
          }
        }

        return next;
      });

      setNextDrop((current) => {
        if (feedState !== "default") {
          return Math.max(0, current - 1);
        }
        if (current <= 1) {
          const src = feedPool[poolIdxRef.current % feedPool.length];
          poolIdxRef.current += 1;
          setItems((currentItems) =>
            [
              {
                ...src,
                id: `${src.id}-${tick}`,
                state: tick % 2 ? ("lastone" as const) : ("available" as const),
                dropped: 0,
              },
              ...currentItems,
            ].slice(0, 12),
          );
          return 210 + Math.floor(Math.random() * 150);
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [feedState]);

  const held = items.filter((item) => item.state === "resYou");
  const soonest = held.length ? Math.min(...held.map((item) => item.secondsLeft ?? 0)) : 0;

  function reserve(id: string) {
    setHoldsDismissed(false);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, state: "resYou", secondsLeft: 15 * 60 } : item,
      ),
    );
  }

  function release(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, state: "available", secondsLeft: undefined } : item,
      ),
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 md:px-8">
        <section className="flex flex-wrap items-stretch gap-9 px-1 pb-[30px] pt-[34px]">
          <div className="flex min-w-[300px] flex-1 basis-[440px] flex-col justify-center">
            <div className="mb-4 text-[11.5px] font-semibold uppercase tracking-[.22em] text-accent">
              Second-hand, first choice · Lagos
            </div>
            <h1 className="mb-[18px] font-serif text-[52px] font-medium leading-[1.03] tracking-[-.015em] max-sm:text-[42px]">
              Someone loved it first.
              <br />
              <em className="font-normal">Now it&apos;s yours.</em>
            </h1>
            <p className="mb-[26px] max-w-[440px] text-[15px] leading-[1.65] text-muted-foreground">
              A living rail of one-of-one pieces — hand-picked, cleaned, and graded. Every item is
              the only one. When it&apos;s gone, it&apos;s gone for good.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="h-[52px] rounded-full px-[30px] text-[14.5px] font-semibold">
                Shop the drop
              </Button>
              <Button
                variant="outline"
                className="h-[52px] rounded-full px-[26px] text-[14.5px] font-medium"
              >
                How reserving works
              </Button>
            </div>
          </div>
          <div className="relative min-h-[400px] min-w-[300px] flex-1 basis-[440px] overflow-hidden rounded-[14px] bg-[linear-gradient(150deg,#5A6152,#3E463A)]">
            <Image
              src="https://drive.google.com/thumbnail?id=1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh&sz=w1000"
              alt="This week's edit"
              fill
              priority
              sizes="(min-width: 900px) 50vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,rgba(0,0,0,.6))]" />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-[13px] py-[7px] backdrop-blur">
              <span className="size-[7px] animate-[leemPulse_1.8s_ease-in-out_infinite] rounded-full bg-[#B8CE8E]" />
              <span className="text-[11.5px] tracking-[.08em] text-white">
                LIVE · {items.length} pieces in the rail
              </span>
            </div>
            <div className="absolute bottom-5 left-[22px] right-[22px] text-white">
              <div className="mb-1 font-serif text-[22px] italic">
                This week&apos;s daisy-field edit
              </div>
              <div className="text-[12.5px] leading-[1.5] text-white/82">
                Drop your own campaign photo here.
              </div>
            </div>
          </div>
        </section>

        <section id="justin" className="px-1 pb-2 pt-[14px]">
          <div className="mb-1.5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="size-2 animate-[leemPulse_1.6s_ease-in-out_infinite] rounded-full bg-accent" />
                <span className="text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">
                  Live drops · updated just now
                </span>
              </div>
              <h2 className="font-serif text-[34px] font-medium leading-[1.05]">
                Just In{" "}
                <em className="text-[26px] font-normal text-[#8A887E]">
                  — one-of-one, the moment they land
                </em>
              </h2>
            </div>
            <div className="inline-flex items-center gap-[9px] rounded-full border border-border bg-card px-[15px] py-[9px]">
              <Clock className="text-accent" />
              <span className="text-[12.5px] text-muted-foreground">
                Next drop <strong className="text-foreground">{fmt(nextDrop)}</strong>
              </span>
            </div>
          </div>
          <div className="my-5 flex flex-wrap items-center justify-between gap-4">
            <ToggleGroup
              value={[activeFilter]}
              onValueChange={(value) => value[0] && setActiveFilter(value[0])}
              className="flex flex-wrap gap-2"
            >
              {filters.map((filter) => (
                <ToggleGroupItem
                  key={filter}
                  value={filter}
                  className={cn(
                    "min-h-9 rounded-full border px-[15px] py-2 text-[13px]",
                    activeFilter === filter
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {filter}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-input bg-muted p-1">
              <span className="px-1.5 text-[10.5px] uppercase tracking-[.1em] text-[#9A988F]">
                Feed
              </span>
              <ToggleGroup
                value={[feedState]}
                onValueChange={(value) => value[0] && setFeedState(value[0] as FeedState)}
                spacing={1}
              >
                {feedTabs.map((tab) => (
                  <ToggleGroupItem
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "h-[30px] rounded-full border-0 px-3 text-[12px]",
                      feedState === tab.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          {feedState === "default" ? (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-[18px]">
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    notified={!!notified[product.id]}
                    wished={!!wished[product.id]}
                    onNotify={() => setNotified((current) => ({ ...current, [product.id]: true }))}
                    onRelease={() => release(product.id)}
                    onReserve={() => reserve(product.id)}
                    onWish={() =>
                      setWished((current) => ({ ...current, [product.id]: !current[product.id] }))
                    }
                  />
                ))}
              </div>
              <div className="mt-[26px] flex justify-center">
                <Button
                  variant="outline"
                  className="h-12 rounded-full px-[30px] text-[14px] font-medium"
                >
                  Load more pieces
                </Button>
              </div>
            </>
          ) : feedState === "loading" ? (
            <LoadingFeed />
          ) : feedState === "error" ? (
            <ErrorFeed onRetry={() => setFeedState("default")} />
          ) : (
            <EmptyFeed nextDrop={nextDrop} />
          )}
        </section>

        <section className="px-1 py-11">
          <h2 className="mb-[18px] font-serif text-[26px] font-medium">Shop by category</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            {categories.map((category) => (
              <Link
                href="#"
                key={category.name}
                className="relative flex aspect-[3/4] items-end overflow-hidden rounded-[14px] bg-[linear-gradient(150deg,#6B7360,#474E3F)] p-4"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="20vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,rgba(0,0,0,.5))]" />
                <div className="relative text-white">
                  <div className="font-serif text-[20px]">{category.name}</div>
                  <div className="text-[11.5px] text-white/82">{category.count} pieces</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          id="how"
          className="my-7 grid gap-[22px] rounded-[14px] bg-muted px-6 py-[26px] md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]"
        >
          <div>
            <div className="mb-3 text-[11px] uppercase tracking-[.16em] text-[#9A988F]">
              Shop by condition
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["Excellent", "bg-accent", "border-chip-border bg-chip-bg text-[#4A5540]"],
                ["Good", "bg-star", "border-border bg-card text-muted-foreground"],
                ["Fair", "bg-[#B0682E]", "border-border bg-card text-muted-foreground"],
              ].map(([label, dot, classes]) => (
                <Link
                  href="#"
                  key={label}
                  className={cn(
                    "inline-flex items-center gap-[7px] rounded-full border px-3.5 py-2 text-[13px]",
                    classes,
                  )}
                >
                  <span className={cn("size-2 rounded-full", dot)} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 text-[11px] uppercase tracking-[.16em] text-[#9A988F]">
              Shop by price
            </div>
            <div className="flex flex-wrap gap-2">
              {["Under ₦10k", "₦10k–₦25k", "Vintage"].map((label) => (
                <Link
                  href="#"
                  key={label}
                  className="rounded-full border border-border bg-card px-3.5 py-2 text-[13px] text-muted-foreground"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 text-[11px] uppercase tracking-[.16em] text-[#9A988F]">
              How reserving works
            </div>
            <p className="m-0 text-[12.5px] leading-[1.6] text-muted-foreground">
              Add a piece to your cart to place a <strong>15 min</strong> hold. No one else can buy
              it while you decide. Don&apos;t check out in time and it quietly returns to the rail.
            </p>
          </div>
        </section>

        <section className="px-1 py-11">
          <div className="mb-[18px] flex items-center justify-between">
            <h2 className="font-serif text-[26px] font-medium">Recently reduced</h2>
            <Link
              href="#"
              className="text-[13px] text-muted-foreground underline underline-offset-2"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[18px]">
            {reducedItems.map((item) => (
              <div key={item.name}>
                <div className="relative aspect-[1/1.1] overflow-hidden rounded-[12px] bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                  <Badge className="absolute left-3 top-3 rounded-full border border-chip-border bg-chip-bg px-2.5 py-1 text-[11px] font-semibold text-accent">
                    {item.discount}
                  </Badge>
                </div>
                <div className="px-0.5 pt-[11px]">
                  <div className="mb-[3px] text-[13px]">{item.name}</div>
                  <div className="flex items-baseline gap-[7px]">
                    <span className="text-[13.5px] font-semibold">{item.price}</span>
                    <span className="text-[12px] text-[#A7A59B] line-through">{item.original}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="journal" className="px-1 py-11">
          <div className="mb-[18px] flex items-center justify-between">
            <h2 className="font-serif text-[26px] font-medium">From the Journal</h2>
            <Link
              href="#"
              className="text-[13px] text-muted-foreground underline underline-offset-2"
            >
              All stories
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {journal.map((item) => (
              <Link href="#" key={item.title} className="block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-[linear-gradient(150deg,#5A6152,#3E463A)]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,rgba(0,0,0,.55))]" />
                  <div className="absolute bottom-4 left-[18px] right-[18px] text-white">
                    <div className="mb-1.5 text-[10.5px] uppercase tracking-[.16em] text-white/78">
                      {item.kicker}
                    </div>
                    <div className="font-serif text-[20px] leading-[1.15]">{item.title}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="my-[34px] grid gap-[18px] rounded-[14px] bg-muted px-5 py-[26px] md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {[
            [Truck, "Free delivery", "Free nationwide shipping over ₦25,000."],
            [ShieldCheck, "Inspected & graded", "Every piece hand-checked on a 4-point scale."],
            [Timer, "Held while you decide", "Reserve for 15 min — no one can take it."],
          ].map(([Icon, title, body]) => (
            <div key={title as string} className="flex flex-col items-center gap-2 text-center">
              <Icon />
              <div className="text-[15px] font-semibold">{title as string}</div>
              <div className="text-[12.5px] text-[#8A887E]">{body as string}</div>
            </div>
          ))}
        </section>
      </main>

      {held.length > 0 && !holdsDismissed ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 py-3">
          <div className="flex w-full max-w-[720px] items-center gap-3.5 rounded-full bg-[#20261C] py-2.5 pl-5 pr-3 text-white shadow-[0_20px_50px_rgba(0,0,0,.28)]">
            <span className="size-2 shrink-0 animate-[leemPulse_1.6s_ease-in-out_infinite] rounded-full bg-[#B8CE8E]" />
            <span className="min-w-0 flex-1 text-[13px] leading-[1.4]">
              You&apos;re holding {held.length === 1 ? "1 piece" : `${held.length} pieces`} —
              checkout in <strong className="tabular-nums">{fmt(soonest)}</strong> before{" "}
              {held.length === 1 ? "it releases" : "they release"}.
            </span>
            <Button className="h-[38px] shrink-0 rounded-full bg-white px-5 text-[13px] font-semibold text-primary hover:bg-white/90">
              Checkout
            </Button>
            <button
              aria-label="Dismiss"
              className="flex shrink-0 p-1.5 text-white/70"
              onClick={() => setHoldsDismissed(true)}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
