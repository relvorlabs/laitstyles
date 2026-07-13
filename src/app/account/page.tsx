"use client";

import {
  Check,
  Clock,
  Heart,
  Home,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { formatHoldTime, useShop } from "@/components/shop/shop-provider";
import { naira, type PlpProduct, pdpHref, plpItems } from "@/lib/catalogue";
import {
  getLatestOrderSnapshot,
  getServerOrderSnapshot,
  type OrderReceipt,
  parseOrderReceipt,
  subscribeToLatestOrder,
} from "@/lib/order";

type AccountTab = "overview" | "orders" | "reservations" | "wishlist" | "addresses";

type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  isDefault: boolean;
};

const navItems: { key: AccountTab; label: string; icon: typeof Home }[] = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "orders", label: "Orders", icon: Package },
  { key: "reservations", label: "Reservations", icon: Clock },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "addresses", label: "Addresses", icon: MapPin },
];

const initialWishlist = plpItems.slice(0, 8).map((item) => item.id);

const initialAddresses: Address[] = [
  {
    id: "home",
    label: "Home",
    recipient: "Amara Okafor",
    phone: "+234 803 412 7788",
    street: "14 Allen Avenue, Awoyaya Court, Flat 3B",
    city: "Ikeja",
    state: "Lagos",
    isDefault: true,
  },
  {
    id: "work",
    label: "Work",
    recipient: "Amara Okafor",
    phone: "+234 701 998 5521",
    street: "1 Adeola Odeku Street, 4th floor",
    city: "Victoria Island",
    state: "Lagos",
    isDefault: false,
  },
];

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountSurface />
    </Suspense>
  );
}

function AccountSurface() {
  const router = useRouter();
  const params = useSearchParams();
  const { heldItems, release, rehold } = useShop();
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const orderSnapshot = useSyncExternalStore(
    subscribeToLatestOrder,
    getLatestOrderSnapshot,
    getServerOrderSnapshot,
  );
  const latestOrder = useMemo(() => parseOrderReceipt(orderSnapshot), [orderSnapshot]);
  const tab = normalizeTab(params.get("tab"));
  const activeHolds = heldItems.filter((item) => item.secondsLeft > 0);
  const expiredHolds = heldItems.filter((item) => item.secondsLeft <= 0);
  const savedProducts = useMemo(
    () =>
      wishlist
        .map((id) => plpItems.find((item) => item.id === id))
        .filter((item): item is PlpProduct => Boolean(item)),
    [wishlist],
  );

  function go(next: AccountTab) {
    router.push(next === "overview" ? "/account" : `/account?tab=${next}`);
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-20 pt-8 max-sm:px-4">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.26em] text-[#7C8C63]">
            Your Laitstyle rail
          </div>
          <h1 className="font-serif text-[42px] font-medium italic">Welcome back, Amara.</h1>
          <p className="mt-2 text-[13.5px] text-[#6E6C64]">
            Manage the pieces you hold, save and send home.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center gap-2 rounded-full border border-primary px-5 text-[13px] font-semibold"
          href="/shop"
        >
          <ShoppingBag aria-hidden="true" className="size-4" />
          Browse the drop
        </Link>
      </div>

      <div className="grid grid-cols-[230px_minmax(0,1fr)] gap-8 max-md:grid-cols-1">
        <aside>
          <div className="rounded-[16px] border border-border bg-white p-3 max-md:overflow-x-auto">
            <nav
              aria-label="Account sections"
              className="flex flex-col gap-1 max-md:min-w-max max-md:flex-row"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const count =
                  item.key === "reservations"
                    ? heldItems.length
                    : item.key === "wishlist"
                      ? wishlist.length
                      : item.key === "addresses"
                        ? addresses.length
                        : undefined;

                return (
                  <button
                    aria-current={tab === item.key ? "page" : undefined}
                    className={
                      tab === item.key
                        ? "flex h-11 items-center gap-3 rounded-[10px] bg-[#F2F4EA] px-3.5 text-left text-[13.5px] font-semibold text-[#4A5540]"
                        : "flex h-11 items-center gap-3 rounded-[10px] px-3.5 text-left text-[13.5px] text-[#57554E] hover:bg-[#F7F6F2]"
                    }
                    key={item.key}
                    onClick={() => go(item.key)}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="size-[17px]" />
                    <span>{item.label}</span>
                    {count !== undefined ? (
                      <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10.5px] tabular-nums text-[#6E6C64]">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0">
          {tab === "overview" ? (
            <Overview
              activeHolds={activeHolds}
              addresses={addresses}
              go={go}
              latestOrder={latestOrder}
              savedProducts={savedProducts}
            />
          ) : null}
          {tab === "orders" ? <Orders latestOrder={latestOrder} /> : null}
          {tab === "reservations" ? (
            <Reservations
              activeHolds={activeHolds}
              expiredHolds={expiredHolds}
              release={release}
              rehold={rehold}
            />
          ) : null}
          {tab === "wishlist" ? (
            <Wishlist
              products={savedProducts}
              remove={(id) => {
                setWishlist((current) => current.filter((item) => item !== id));
                setNotice("Piece removed from your wishlist.");
              }}
            />
          ) : null}
          {tab === "addresses" ? (
            <Addresses
              addresses={addresses}
              formOpen={addressFormOpen}
              onAdd={(address) => {
                setAddresses((current) => [...current, address]);
                setAddressFormOpen(false);
                setNotice("Delivery address saved.");
              }}
              onCancel={() => setAddressFormOpen(false)}
              onDelete={(id) => {
                setAddresses((current) => current.filter((address) => address.id !== id));
                setNotice("Address removed.");
              }}
              onOpen={() => setAddressFormOpen(true)}
              onSetDefault={(id) =>
                setAddresses((current) =>
                  current.map((address) => ({
                    ...address,
                    isDefault: address.id === id,
                  })),
                )
              }
            />
          ) : null}
        </section>
      </div>

      {notice ? (
        <div
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1B1A17] px-5 py-3 text-[12.5px] font-semibold text-white shadow-laitstyle"
        >
          <span>{notice}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice("")} type="button">
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ) : null}
    </main>
  );
}

function Overview({
  activeHolds,
  addresses,
  go,
  latestOrder,
  savedProducts,
}: {
  activeHolds: ReturnType<typeof useShop>["heldItems"];
  addresses: Address[];
  go: (tab: AccountTab) => void;
  latestOrder: OrderReceipt | null;
  savedProducts: PlpProduct[];
}) {
  return (
    <div>
      <SectionHeading eyebrow="Overview" title="Your one-of-one activity" />
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatCard
          label="Active holds"
          value={String(activeHolds.length)}
          onClick={() => go("reservations")}
        />
        <StatCard
          label="Saved pieces"
          value={String(savedProducts.length)}
          onClick={() => go("wishlist")}
        />
        <StatCard
          label="Recent orders"
          value={latestOrder ? "1" : "0"}
          onClick={() => go("orders")}
        />
        <StatCard
          label="Saved addresses"
          value={String(addresses.length)}
          onClick={() => go("addresses")}
        />
      </div>

      <div className="mt-9 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-[28px] font-medium">Reserved to you</h2>
          <p className="mt-1 text-[12.5px] text-[#8A887E]">
            Active holds stay synchronized with your bag.
          </p>
        </div>
        <button
          className="text-[12.5px] font-semibold text-[#7C8C63]"
          onClick={() => go("reservations")}
          type="button"
        >
          View reservations →
        </button>
      </div>

      {activeHolds.length ? (
        <div className="mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          {activeHolds.slice(0, 2).map(({ product, secondsLeft }) => (
            <Link
              className="flex gap-3 rounded-[14px] border border-border bg-white p-3"
              href={pdpHref(product.id)}
              key={product.id}
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[9px] bg-muted">
                <Image
                  alt={product.name}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={product.image}
                />
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-[13.5px] font-semibold">{product.name}</div>
                <div className="mt-1 text-[12px] text-[#8A887E]">
                  Size {product.size} · {product.condition}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F2F4EA] px-2.5 py-1 text-[11px] font-semibold text-[#4A5540]">
                  <Clock aria-hidden="true" className="size-3" />
                  {formatHoldTime(secondsLeft)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyRail
          title="Nothing held right now"
          text="Reserve a one-of-one piece and it will appear here."
        />
      )}

      <div className="mt-9 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-[28px] font-medium">Saved pieces</h2>
          <p className="mt-1 text-[12.5px] text-[#8A887E]">
            Still live on the rail for every shopper.
          </p>
        </div>
        <button
          className="text-[12.5px] font-semibold text-[#7C8C63]"
          onClick={() => go("wishlist")}
          type="button"
        >
          View all wishlist →
        </button>
      </div>
      <ProductGrid products={savedProducts.slice(0, 4)} />
    </div>
  );
}

function Orders({ latestOrder }: { latestOrder: OrderReceipt | null }) {
  return (
    <div>
      <SectionHeading eyebrow="Purchase history" title="Orders" />
      {latestOrder ? (
        <article className="rounded-[16px] border border-border bg-white p-6 max-sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="text-[11px] uppercase tracking-[.12em] text-[#8A887E]">
                Order #{latestOrder.orderNumber}
              </div>
              <h2 className="mt-1 font-serif text-[25px]">Confirmed and preparing</h2>
              <p className="mt-1 text-[12.5px] text-[#6E6C64]">
                Estimated delivery {latestOrder.eta}
              </p>
            </div>
            <span className="rounded-full bg-[#EAF0DD] px-3 py-1.5 text-[11px] font-semibold text-[#5F7043]">
              PAID · {latestOrder.paymentName}
            </span>
          </div>
          <div className="py-4">
            {latestOrder.items.map((item) => (
              <div
                className="flex items-center gap-3 border-b border-[#F4F3EE] py-3 last:border-b-0"
                key={item.id}
              >
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[9px] bg-muted">
                  <Image
                    alt={item.name}
                    className="object-cover"
                    fill
                    sizes="56px"
                    src={item.image}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{item.name}</div>
                  <div className="text-[11.5px] text-[#8A887E]">
                    Size {item.size} · {item.condition}
                  </div>
                </div>
                <span className="text-[13px] font-semibold">{naira(item.price)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div className="inline-flex items-center gap-2 text-[12.5px] text-[#57554E]">
              <Truck aria-hidden="true" className="size-4 text-[#7C8C63]" />
              {latestOrder.zoneName}
            </div>
            <div className="font-serif text-[23px]">{naira(latestOrder.total)}</div>
          </div>
        </article>
      ) : (
        <EmptyRail
          title="No orders yet"
          text="Your completed one-of-one purchases will appear here after checkout."
        />
      )}
    </div>
  );
}

function Reservations({
  activeHolds,
  expiredHolds,
  release,
  rehold,
}: {
  activeHolds: ReturnType<typeof useShop>["heldItems"];
  expiredHolds: ReturnType<typeof useShop>["heldItems"];
  release: (id: string) => void;
  rehold: (id: string) => void;
}) {
  const items = [...activeHolds, ...expiredHolds];
  return (
    <div>
      <SectionHeading eyebrow="Time-sensitive" title="Reservations" />
      <p className="-mt-4 mb-6 max-w-[620px] text-[13.5px] leading-[1.6] text-[#6E6C64]">
        Your reservation rail is the same bag used on Home, product pages, cart and checkout.
      </p>
      {items.length ? (
        <div className="flex flex-col gap-3">
          {items.map(({ product, secondsLeft }) => {
            const expired = secondsLeft <= 0;
            return (
              <article
                className="flex flex-wrap items-center gap-4 rounded-[16px] border border-border bg-white p-4"
                key={product.id}
              >
                <Link
                  className="relative h-28 w-[88px] shrink-0 overflow-hidden rounded-[11px] bg-muted"
                  href={pdpHref(product.id)}
                >
                  <Image
                    alt={product.name}
                    className={expired ? "object-cover opacity-55 grayscale" : "object-cover"}
                    fill
                    sizes="88px"
                    src={product.image}
                  />
                </Link>
                <div className="min-w-[200px] flex-1">
                  <Link className="text-[15px] font-semibold" href={pdpHref(product.id)}>
                    {product.name}
                  </Link>
                  <p className="mt-1 text-[12.5px] text-[#8A887E]">
                    Size {product.size} · {product.color} · {product.condition}
                  </p>
                  <span
                    className={
                      expired
                        ? "mt-3 inline-flex rounded-full bg-[#FBF0EE] px-3 py-1 text-[11.5px] font-semibold text-[#8A362F]"
                        : "mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F2F4EA] px-3 py-1 text-[11.5px] font-semibold text-[#4A5540]"
                    }
                  >
                    {expired ? (
                      "Hold expired"
                    ) : (
                      <>
                        <Clock aria-hidden="true" className="size-3" />
                        {formatHoldTime(secondsLeft)} remaining
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className="font-serif text-[21px]">{naira(product.price)}</span>
                  <div className="flex gap-2">
                    {expired ? (
                      <button
                        className="h-9 rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground"
                        onClick={() => rehold(product.id)}
                        type="button"
                      >
                        Re-hold
                      </button>
                    ) : (
                      <Link
                        className="flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground"
                        href="/cart"
                      >
                        Review bag
                      </Link>
                    )}
                    <button
                      aria-label={`Release ${product.name}`}
                      className="flex size-9 items-center justify-center rounded-full border border-border"
                      onClick={() => release(product.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyRail
          title="No active reservations"
          text="Reserve a piece for 15 minutes and it will appear here."
        />
      )}
    </div>
  );
}

function Wishlist({ products, remove }: { products: PlpProduct[]; remove: (id: string) => void }) {
  return (
    <div>
      <SectionHeading eyebrow="Saved rail" title={`Wishlist — ${products.length}`} />
      <p className="-mt-4 mb-6 max-w-[650px] text-[13.5px] leading-[1.6] text-[#6E6C64]">
        Saved pieces remain available to other shoppers until you reserve them.
      </p>
      {products.length ? (
        <div className="grid grid-cols-3 gap-x-4 gap-y-8 max-lg:grid-cols-2">
          {products.map((product) => (
            <article key={product.id}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted">
                <Link href={pdpHref(product.id)}>
                  <Image
                    alt={product.name}
                    className={
                      product.state === "sold" || product.state === "resOthers"
                        ? "object-cover opacity-60 grayscale"
                        : "object-cover"
                    }
                    fill
                    sizes="(max-width: 768px) 50vw, 28vw"
                    src={product.image}
                  />
                </Link>
                <button
                  aria-label={`Remove ${product.name} from wishlist`}
                  className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/92"
                  onClick={() => remove(product.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex justify-between gap-3">
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
            </article>
          ))}
        </div>
      ) : (
        <EmptyRail
          title="Your wishlist is empty"
          text="Save a piece from Home, the catalogue or a product page."
        />
      )}
    </div>
  );
}

function Addresses({
  addresses,
  formOpen,
  onAdd,
  onCancel,
  onDelete,
  onOpen,
  onSetDefault,
}: {
  addresses: Address[];
  formOpen: boolean;
  onAdd: (address: Address) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onOpen: () => void;
  onSetDefault: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <SectionHeading eyebrow="Delivery book" title="Addresses" />
        {!formOpen ? (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[12.5px] font-semibold text-primary-foreground"
            onClick={onOpen}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add address
          </button>
        ) : null}
      </div>
      {formOpen ? <AddressForm onAdd={onAdd} onCancel={onCancel} /> : null}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {addresses.map((address) => (
          <article className="rounded-[16px] border border-border bg-white p-5" key={address.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-[23px]">{address.label}</h2>
                  {address.isDefault ? (
                    <span className="rounded-full bg-[#EAF0DD] px-2 py-1 text-[10px] font-semibold text-[#5F7043]">
                      DEFAULT
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 text-[13px] leading-[1.65] text-[#57554E]">
                  <strong className="text-[#1B1A17]">{address.recipient}</strong>
                  <br />
                  {address.street}
                  <br />
                  {address.city}, {address.state}
                  <br />
                  {address.phone}
                </div>
              </div>
              <MapPin aria-hidden="true" className="size-5 text-[#7C8C63]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              {!address.isDefault ? (
                <button
                  className="h-9 rounded-full border border-border px-3.5 text-[11.5px] font-semibold"
                  onClick={() => onSetDefault(address.id)}
                  type="button"
                >
                  Make default
                </button>
              ) : null}
              <button
                aria-label={`Delete ${address.label} address`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-[#B4453C]"
                onClick={() => onDelete(address.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AddressForm({
  onAdd,
  onCancel,
}: {
  onAdd: (address: Address) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    label: "Home",
    recipient: "",
    phone: "+234 ",
    street: "",
    city: "",
    state: "Lagos",
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !form.recipient.trim() ||
      !form.street.trim() ||
      !form.city.trim() ||
      form.phone.replace(/\D/g, "").length < 10
    ) {
      setError("Complete the recipient, phone, street and city fields.");
      return;
    }
    onAdd({ id: `address-${Date.now()}`, ...form, isDefault: false });
  }

  return (
    <form
      className="mb-6 rounded-[16px] border border-[#D6DAC8] bg-[#F7F8F2] p-5"
      onSubmit={submit}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-[25px]">Add delivery address</h2>
        <button
          aria-label="Cancel adding address"
          className="flex size-9 items-center justify-center rounded-full border border-border bg-white"
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {(["label", "recipient", "phone", "street", "city", "state"] as const).map((field) => (
          <label className={field === "street" ? "col-span-2 max-sm:col-span-1" : ""} key={field}>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.06em] text-[#6E6C64]">
              {field}
            </span>
            <input
              autoComplete={
                field === "recipient"
                  ? "name"
                  : field === "phone"
                    ? "tel"
                    : field === "street"
                      ? "street-address"
                      : field === "city"
                        ? "address-level2"
                        : field === "state"
                          ? "address-level1"
                          : "off"
              }
              className="h-11 w-full rounded-[9px] border border-border bg-white px-3.5 text-[13px] outline-none focus:border-primary"
              name={field}
              onChange={(event) =>
                setForm((current) => ({ ...current, [field]: event.target.value }))
              }
              type={field === "phone" ? "tel" : "text"}
              value={form[field]}
            />
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-3 text-[12px] text-[#B4453C]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mt-4 h-11 rounded-full bg-primary px-5 text-[12.5px] font-semibold text-primary-foreground"
        type="submit"
      >
        Save address
      </button>
    </form>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.22em] text-[#7C8C63]">
        {eyebrow}
      </div>
      <h1 className="font-serif text-[34px] font-medium">{title}</h1>
    </div>
  );
}

function StatCard({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      className="rounded-[14px] border border-border bg-white p-4 text-left"
      onClick={onClick}
      type="button"
    >
      <div className="font-serif text-[30px]">{value}</div>
      <div className="mt-1 text-[11.5px] text-[#8A887E]">{label}</div>
    </button>
  );
}

function ProductGrid({ products }: { products: PlpProduct[] }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-3 max-lg:grid-cols-2">
      {products.map((product) => (
        <Link href={pdpHref(product.id)} key={product.id}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-muted">
            <Image
              alt={product.name}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 50vw, 20vw"
              src={product.image}
            />
          </div>
          <h3 className="mt-2 line-clamp-2 text-[12.5px] font-medium">{product.name}</h3>
          <div className="mt-1 text-[12px] font-semibold">{naira(product.price)}</div>
        </Link>
      ))}
    </div>
  );
}

function EmptyRail({ text, title }: { text: string; title: string }) {
  return (
    <div className="mt-4 flex min-h-[260px] flex-col items-center justify-center rounded-[16px] border border-border bg-white px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
        <Check aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-4 font-serif text-[27px]">{title}</h2>
      <p className="mt-2 max-w-[400px] text-[13px] leading-[1.6] text-[#6E6C64]">{text}</p>
      <Link
        className="mt-5 h-10 rounded-full bg-primary px-5 py-2.5 text-[12px] font-semibold text-primary-foreground"
        href="/shop"
      >
        Browse the drop
      </Link>
    </div>
  );
}

function AccountLoading() {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-6 py-10">
      <div className="h-20 w-2/3 animate-pulse rounded-[14px] bg-muted" />
      <div className="mt-8 grid grid-cols-[230px_1fr] gap-8 max-md:grid-cols-1">
        <div className="h-[360px] animate-pulse rounded-[16px] bg-muted" />
        <div className="h-[520px] animate-pulse rounded-[16px] bg-muted" />
      </div>
    </main>
  );
}

function normalizeTab(value: string | null): AccountTab {
  return value === "orders" ||
    value === "reservations" ||
    value === "wishlist" ||
    value === "addresses"
    ? value
    : "overview";
}
