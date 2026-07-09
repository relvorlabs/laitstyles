"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  Boxes,
  Clock3,
  Command,
  ImagePlus,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  ControlRoomProvider,
  useControlRoom,
} from "@/components/admin/control-room-context";
import { ControlRoomOverlays } from "@/components/admin/control-room-overlays";
import { ControlRoomSectionView } from "@/components/admin/control-room-sections";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  controlRoomSections,
  inventoryTotals,
  type ControlRoomSection,
} from "@/lib/control-room";
import { naira } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

const iconMap: Record<ControlRoomSection, ReactNode> = {
  overview: <LayoutDashboard />,
  inventory: <Boxes />,
  intake: <ImagePlus />,
  orders: <ShoppingBag />,
  holds: <Clock3 />,
  offline: <Banknote />,
  customers: <UsersRound />,
  settings: <Settings />,
};

const sectionHeadings: Record<
  ControlRoomSection,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Today at Laitstyle",
    title: "See the whole store without reading the whole database.",
    description:
      "Revenue, inventory pressure, orders, holds and unfinished arrivals—organised around the decisions you need to make.",
  },
  inventory: {
    eyebrow: "Stock control",
    title: "Manage the style, then every physical unit behind it.",
    description:
      "One-of-one pieces and stocked styles share one inventory model with variants, images, pricing, holds, sales and publication.",
  },
  intake: {
    eyebrow: "Preparation queue",
    title: "Turn new arrivals into complete, sellable inventory.",
    description:
      "Intake is where photos, grading, measurements and variant counts are completed before a piece becomes inventory.",
  },
  orders: {
    eyebrow: "Fulfilment",
    title: "Track each sale from payment to the customer’s door.",
    description:
      "See payment state, what was bought, packing work, dispatch progress and delivery exceptions in one place.",
  },
  holds: {
    eyebrow: "Reservation control",
    title: "Protect shopper intent without losing sight of available stock.",
    description:
      "Extend or release time-sensitive holds while keeping those units unavailable to website and offline sales.",
  },
  offline: {
    eyebrow: "Hand-to-hand sales",
    title: "Record offline revenue without creating inventory conflicts.",
    description:
      "WhatsApp, Instagram, walk-in and pop-up sales reduce the exact variant sold and appear in total revenue.",
  },
  customers: {
    eyebrow: "Customer relationships",
    title: "Know the person behind every order, payment and delivery.",
    description:
      "Profiles combine order history, spend, delivery performance, reviews and useful preferences without CRM clutter.",
  },
  settings: {
    eyebrow: "Store preferences",
    title: "Choose how the store should behave—in normal language.",
    description:
      "Manage shopping rules, delivery promises, payments, notifications and team access without technical configuration.",
  },
};

const validSections = new Set<ControlRoomSection>(
  controlRoomSections.map((section) => section.key),
);

export function ControlRoom() {
  return (
    <ControlRoomProvider>
      <ControlRoomShell />
    </ControlRoomProvider>
  );
}

function ControlRoomShell() {
  const params = useParams<{ section?: string[] }>();
  const sectionParam = params.section?.[0] as ControlRoomSection | undefined;
  const activeSection =
    sectionParam && validSections.has(sectionParam) ? sectionParam : "overview";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const {
    inventory,
    intake,
    orders,
    holds,
    offlineSales,
    openNewPiece,
  } = useControlRoom();

  const heading = sectionHeadings[activeSection];
  const liveStyles = inventory.filter(
    (style) => style.status === "live" && style.published,
  ).length;
  const availableUnits = inventory.reduce(
    (sum, style) => sum + inventoryTotals(style).available,
    0,
  );
  const activeOrders = orders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status),
  ).length;
  const activeHolds = holds.filter((hold) => hold.secondsLeft > 0).length;
  const revenue =
    orders
      .filter(
        (order) =>
          order.status !== "cancelled" &&
          (order.payment === "paid" || order.payment === "deposit"),
      )
      .reduce((sum, order) => sum + order.amount, 0) +
    offlineSales.reduce((sum, sale) => sum + sale.amount, 0);

  return (
    <div className="min-h-dvh bg-[#F6F4EE] text-[#1D1C19]">
      <div className="grid min-h-dvh lg:grid-cols-[282px_minmax(0,1fr)]">
        <ControlSidebar
          active={activeSection}
          availableUnits={availableUnits}
          className="hidden lg:flex"
          intakeCount={intake.length}
          liveStyles={liveStyles}
        />

        <main className="min-w-0">
          <ControlTopbar
            activeHolds={activeHolds}
            activeOrders={activeOrders}
            onAdd={() => openNewPiece()}
            onMenu={() => setMobileNavOpen(true)}
            onSearch={() => setSearchOpen(true)}
            revenue={revenue}
          />

          <div className="mx-auto w-full max-w-[1540px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
            <header className="mb-6 flex flex-col gap-5 border-b border-[#DCD9CF] pb-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[.2em] text-[#6C7858]">
                  {heading.eyebrow}
                </p>
                <h1 className="mt-2 max-w-[920px] text-balance font-serif text-[38px] font-medium leading-[1.02] tracking-[-.025em] sm:text-[48px]">
                  {heading.title}
                </h1>
                <p className="mt-3 max-w-[820px] text-[13px] leading-[1.65] text-[#6D6A62] sm:text-[14px]">
                  {heading.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HeaderSignal
                  label={`${activeOrders} active orders`}
                  tone="blue"
                />
                <HeaderSignal
                  label={`${activeHolds} live holds`}
                  tone="gold"
                />
                <HeaderSignal
                  label={`${availableUnits} units ready`}
                  tone="sage"
                />
              </div>
            </header>

            <ControlRoomSectionView section={activeSection} />
          </div>
        </main>
      </div>

      <MobileControlNav
        active={activeSection}
        onOpenMenu={() => setMobileNavOpen(true)}
      />
      <MobileSidebar
        active={activeSection}
        availableUnits={availableUnits}
        intakeCount={intake.length}
        liveStyles={liveStyles}
        onClose={() => setMobileNavOpen(false)}
        open={mobileNavOpen}
      />
      <GlobalControlSearch
        onClose={() => setSearchOpen(false)}
        open={searchOpen}
      />
      <ControlRoomOverlays />
    </div>
  );
}

function ControlSidebar({
  active,
  availableUnits,
  className,
  intakeCount,
  liveStyles,
}: {
  active: ControlRoomSection;
  availableUnits: number;
  className?: string;
  intakeCount: number;
  liveStyles: number;
}) {
  const groups = ["Today", "Commerce", "Relationships", "Business"] as const;

  return (
    <aside
      className={cn(
        "sticky top-0 h-dvh flex-col overflow-hidden bg-[#1B2118] px-3.5 py-4 text-white",
        className,
      )}
    >
      <Link
        className="flex items-center gap-3 rounded-[16px] px-3 py-2.5"
        href="/admin"
      >
        <span className="grid size-10 place-items-center rounded-[13px] bg-[#E8EEE1] text-[#536044]">
          <Store className="size-[18px]" />
        </span>
        <span>
          <span className="block font-serif text-[23px] leading-none">
            Laitstyle
          </span>
          <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-[.18em] text-white/42">
            Control room
          </span>
        </span>
      </Link>

      <div className="mt-5 flex-1 overflow-y-auto px-0.5 pb-5">
        {groups.map((group) => {
          const items = controlRoomSections.filter(
            (section) => section.group === group,
          );
          return (
            <div className="mb-5" key={group}>
              <p className="mb-2 px-3 text-[8.5px] font-semibold uppercase tracking-[.2em] text-white/32">
                {group}
              </p>
              <nav className="space-y-1">
                {items.map((item) => {
                  const badge =
                    item.key === "intake"
                      ? intakeCount
                      : item.key === "inventory"
                        ? liveStyles
                        : undefined;
                  return (
                    <Link
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-[13px] px-3 text-[12.5px] text-white/58 transition-colors hover:bg-white/6 hover:text-white",
                        active === item.key &&
                          "bg-[#E8EEE1] text-[#263020] shadow-[0_8px_30px_rgba(0,0,0,.12)] hover:bg-[#E8EEE1] hover:text-[#263020]",
                      )}
                      href={
                        item.key === "overview"
                          ? "/admin"
                          : `/admin/${item.key}`
                      }
                      key={item.key}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center [&_svg]:size-[15px]",
                          active === item.key
                            ? "text-[#61704C]"
                            : "text-white/46 group-hover:text-white/78",
                        )}
                      >
                        {iconMap[item.key]}
                      </span>
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {badge !== undefined ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                            active === item.key
                              ? "bg-white text-[#536044]"
                              : "bg-white/8 text-white/52",
                          )}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="rounded-[18px] border border-white/8 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-[.14em] text-white/38">
            Stock pulse
          </span>
          <BadgeCheck className="size-4 text-[#A9B895]" />
        </div>
        <p className="mt-3 font-serif text-[28px]">{availableUnits}</p>
        <p className="mt-1 text-[10.5px] leading-[1.45] text-white/46">
          units available after shopper holds
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full w-[72%] rounded-full bg-[#A9B895]" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-[14px] px-2 py-2">
        <span className="grid size-9 place-items-center rounded-full bg-[#35402F] font-serif text-[13px]">
          SO
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold">Surdma O.</p>
          <p className="mt-0.5 text-[9.5px] text-white/38">Store owner</p>
        </div>
        <UserRound className="size-4 text-white/38" />
      </div>
    </aside>
  );
}

function ControlTopbar({
  activeHolds,
  activeOrders,
  onAdd,
  onMenu,
  onSearch,
  revenue,
}: {
  activeHolds: number;
  activeOrders: number;
  onAdd: () => void;
  onMenu: () => void;
  onSearch: () => void;
  revenue: number;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-[#DDDAD1] bg-[#F6F4EE]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1540px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Open control room navigation"
          className="grid size-10 place-items-center rounded-full border border-[#D8D5CB] bg-white lg:hidden"
          onClick={onMenu}
          type="button"
        >
          <Menu className="size-[18px]" />
        </button>

        <button
          className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-full border border-[#D8D5CB] bg-white px-4 text-left text-[11.5px] text-[#8A887E] lg:max-w-[430px]"
          onClick={onSearch}
          type="button"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">Search stock, order, customer or SKU…</span>
          <span className="ml-auto hidden items-center gap-1 rounded-full bg-[#F0EEE8] px-2 py-1 text-[9px] font-semibold sm:inline-flex">
            <Command className="size-3" />K
          </span>
        </button>

        <div className="ml-auto hidden items-center gap-5 xl:flex">
          <TopbarMetric label="Revenue" value={naira(revenue)} />
          <TopbarMetric label="Orders moving" value={String(activeOrders)} />
          <TopbarMetric label="Live holds" value={String(activeHolds)} />
        </div>

        <button
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#1D241B] px-4 text-[11.5px] font-semibold text-white"
          onClick={onAdd}
          type="button"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add piece</span>
        </button>
      </div>
    </div>
  );
}

function MobileControlNav({
  active,
  onOpenMenu,
}: {
  active: ControlRoomSection;
  onOpenMenu: () => void;
}) {
  const items: ControlRoomSection[] = [
    "overview",
    "inventory",
    "orders",
    "customers",
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex h-[64px] items-center justify-around rounded-[22px] border border-white/10 bg-[#1B2118]/96 px-2 text-white shadow-[0_18px_60px_rgba(18,22,16,.32)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const section = controlRoomSections.find((row) => row.key === item)!;
        return (
          <Link
            aria-current={active === item ? "page" : undefined}
            className={cn(
              "flex min-w-[58px] flex-col items-center gap-1 text-[8.5px] text-white/48",
              active === item && "text-[#DDE7D2]",
            )}
            href={item === "overview" ? "/admin" : `/admin/${item}`}
            key={item}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full [&_svg]:size-[16px]",
                active === item && "bg-[#DDE7D2] text-[#30402A]",
              )}
            >
              {iconMap[item]}
            </span>
            {section.label}
          </Link>
        );
      })}
      <button
        className="flex min-w-[58px] flex-col items-center gap-1 text-[8.5px] text-white/48"
        onClick={onOpenMenu}
        type="button"
      >
        <span className="grid size-8 place-items-center rounded-full">
          <Menu className="size-[16px]" />
        </span>
        More
      </button>
    </nav>
  );
}

function MobileSidebar({
  active,
  availableUnits,
  intakeCount,
  liveStyles,
  onClose,
  open,
}: {
  active: ControlRoomSection;
  availableUnits: number;
  intakeCount: number;
  liveStyles: number;
  onClose: () => void;
  open: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        className="w-[88%] max-w-[330px] border-0 bg-[#1B2118] p-0 text-white"
        side="left"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Control room navigation</SheetTitle>
          <SheetDescription>Navigate Laitstyle operations.</SheetDescription>
        </SheetHeader>
        <ControlSidebar
          active={active}
          availableUnits={availableUnits}
          className="flex h-full"
          intakeCount={intakeCount}
          liveStyles={liveStyles}
        />
      </SheetContent>
    </Sheet>
  );
}

function GlobalControlSearch({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const {
    inventory,
    orders,
    customers,
    openStyle,
    openOrder,
    openCustomer,
  } = useControlRoom();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) {
      return {
        styles: inventory.slice(0, 4),
        orders: orders.slice(0, 3),
        customers: customers.slice(0, 3),
      };
    }
    return {
      styles: inventory
        .filter((style) =>
          `${style.name} ${style.category} ${style.collection} ${style.variants.map((variant) => variant.sku).join(" ")}`
            .toLowerCase()
            .includes(normalized),
        )
        .slice(0, 5),
      orders: orders
        .filter((order) =>
          `${order.id} ${order.customer} ${order.email}`
            .toLowerCase()
            .includes(normalized),
        )
        .slice(0, 4),
      customers: customers
        .filter((customer) =>
          `${customer.name} ${customer.email} ${customer.phone} ${customer.city}`
            .toLowerCase()
            .includes(normalized),
        )
        .slice(0, 4),
    };
  }, [customers, inventory, normalized, orders]);

  function select(action: () => void) {
    action();
    onClose();
    setQuery("");
  }

  const resultCount =
    results.styles.length + results.orders.length + results.customers.length;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="top-[10%] max-h-[78dvh] w-full max-w-[720px] translate-y-0 overflow-hidden rounded-[22px] bg-[#F7F5EF] p-0">
        <DialogTitle className="sr-only">Search the control room</DialogTitle>
        <DialogDescription className="sr-only">
          Search inventory, orders and customer profiles.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-[#DDDAD1] bg-white px-5 py-4">
          <Search className="size-5 text-[#667252]" />
          <label className="sr-only" htmlFor="control-room-search">
            Search control room
          </label>
          <input
            autoFocus
            className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#A09D93]"
            id="control-room-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search piece, SKU, order or customer…"
            value={query}
          />
          <button
            aria-label="Close search"
            className="grid size-9 place-items-center rounded-full border border-[#DDDAD1]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[64dvh] overflow-y-auto p-4 sm:p-5">
          {!resultCount ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[#E8ECE1] text-[#60704C]">
                <Search className="size-5" />
              </span>
              <h3 className="mt-4 font-serif text-[25px]">Nothing matches yet</h3>
              <p className="mt-2 text-[11.5px] text-[#858278]">
                Try another name, SKU, order number or phone number.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {results.styles.length ? (
                <SearchGroup label="Inventory">
                  {results.styles.map((style) => (
                    <SearchResult
                      icon={<Boxes />}
                      key={style.id}
                      meta={`${inventoryTotals(style).available} available · ${style.variants.length} variants`}
                      onClick={() => select(() => openStyle(style.id))}
                      title={style.name}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results.orders.length ? (
                <SearchGroup label="Orders">
                  {results.orders.map((order) => (
                    <SearchResult
                      icon={<PackageCheck />}
                      key={order.id}
                      meta={`${order.customer} · ${order.status}`}
                      onClick={() => select(() => openOrder(order.id))}
                      title={order.id}
                    />
                  ))}
                </SearchGroup>
              ) : null}
              {results.customers.length ? (
                <SearchGroup label="Customers">
                  {results.customers.map((customer) => (
                    <SearchResult
                      icon={<UserRound />}
                      key={customer.id}
                      meta={`${customer.city} · ${customer.orderCount} orders`}
                      onClick={() => select(() => openCustomer(customer.id))}
                      title={customer.name}
                    />
                  ))}
                </SearchGroup>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HeaderSignal({
  label,
  tone,
}: {
  label: string;
  tone: "sage" | "gold" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[10.5px] font-semibold",
        tone === "sage" &&
          "border-[#CFD8C2] bg-[#EDF1E7] text-[#5C684D]",
        tone === "gold" &&
          "border-[#E7D8B3] bg-[#FFF7E8] text-[#87662B]",
        tone === "blue" &&
          "border-[#D4DAE6] bg-[#F0F2F7] text-[#59657B]",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "sage" && "bg-[#7C8C63]",
          tone === "gold" && "bg-[#C49A51]",
          tone === "blue" && "bg-[#71809B]",
        )}
      />
      {label}
    </span>
  );
}

function TopbarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[#D8D5CB] pl-5">
      <p className="text-[8.5px] font-semibold uppercase tracking-[.11em] text-[#9A978D]">
        {label}
      </p>
      <p className="mt-1 text-[11.5px] font-semibold">{value}</p>
    </div>
  );
}

function SearchGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section>
      <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[.16em] text-[#8A887E]">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function SearchResult({
  icon,
  meta,
  onClick,
  title,
}: {
  icon: ReactNode;
  meta: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-[13px] border border-transparent px-3 py-2.5 text-left hover:border-[#DDDAD1] hover:bg-white"
      onClick={onClick}
      type="button"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-[10px] capitalize text-[#8A887E]">
          {meta}
        </span>
      </span>
    </button>
  );
}
