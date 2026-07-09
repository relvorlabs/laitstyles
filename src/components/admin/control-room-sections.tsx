"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Boxes,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  Filter,
  Grid2X2,
  ImagePlus,
  Layers3,
  List,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PackageCheck,
  PackageOpen,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Tags,
  TimerReset,
  TrendingUp,
  Truck,
  UserRound,
  UsersRound,
  WalletCards,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useControlRoom } from "@/components/admin/control-room-context";
import {
  formatControlRoomTime,
  inventoryTotals,
  inventoryValue,
  type ControlRoomSection,
  type IntakeStage,
  type InventoryStatus,
  type InventoryStyle,
  type OrderStatus,
} from "@/lib/control-room";
import { naira } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

export function ControlRoomSectionView({ section }: { section: ControlRoomSection }) {
  if (section === "inventory") return <InventorySection />;
  if (section === "intake") return <IntakeSection />;
  if (section === "orders") return <OrdersSection />;
  if (section === "holds") return <HoldsSection />;
  if (section === "offline") return <OfflineSalesSection />;
  if (section === "customers") return <CustomersSection />;
  if (section === "settings") return <SettingsSection />;
  return <OverviewSection />;
}

export function OverviewSection() {
  const {
    inventory,
    intake,
    orders,
    holds,
    offlineSales,
    openStyle,
    openOrder,
    openNewPiece,
  } = useControlRoom();

  const liveOrders = orders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status),
  );
  const onlineRevenue = orders
    .filter(
      (order) =>
        order.status !== "cancelled" &&
        (order.payment === "paid" || order.payment === "deposit"),
    )
    .reduce((sum, order) => sum + order.amount, 0);
  const offlineRevenue = offlineSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalAvailable = inventory.reduce(
    (sum, style) => sum + inventoryTotals(style).available,
    0,
  );
  const lowStock = inventory.filter(
    (style) => inventoryTotals(style).lowStock > 0,
  );
  const urgentHolds = holds
    .filter((hold) => hold.secondsLeft > 0)
    .toSorted((a, b) => a.secondsLeft - b.secondsLeft)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-[#1D241B] px-6 py-7 text-white shadow-[0_22px_70px_rgba(29,36,27,.22)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-24 -top-28 size-[340px] rounded-full bg-[#7C8C63]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 size-[300px] rounded-full bg-[#C9A227]/10 blur-3xl" />
          <div className="relative">
            <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-[#C7D0B4]">
                  <Sparkles className="size-3.5" />
                  Thursday control brief
                </div>
                <h2 className="max-w-[620px] text-balance font-serif text-[38px] font-medium leading-[1.02] sm:text-[50px]">
                  The store is moving. Three things need your hand.
                </h2>
              </div>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-[#1D241B]"
                onClick={() => openNewPiece()}
                type="button"
              >
                <Plus className="size-4" />
                Add a piece
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <BriefCard
                eyebrow="Needs attention"
                title={`${intake.length + lowStock.length} open actions`}
                text="Intake details and low-stock variants"
                icon={<AlertTriangle />}
                tone="warm"
              />
              <BriefCard
                eyebrow="Orders moving"
                title={`${liveOrders.length} active orders`}
                text="From payment through delivery"
                icon={<PackageCheck />}
                tone="light"
              />
              <BriefCard
                eyebrow="Stock ready"
                title={`${totalAvailable} units available`}
                text={`${inventory.length} managed styles`}
                icon={<Boxes />}
                tone="sage"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#DEDCD2] bg-[#F1EFE8] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#7A786E]">
                Revenue captured
              </p>
              <p className="mt-2 font-serif text-[38px] font-medium tracking-[-.03em]">
                {naira(onlineRevenue + offlineRevenue)}
              </p>
              <p className="mt-1 text-[12.5px] text-[#77756D]">
                Website and offline sales together
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-white text-[#61704C] shadow-sm">
              <TrendingUp className="size-5" />
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <RevenueSplit
              label="Website"
              amount={onlineRevenue}
              total={onlineRevenue + offlineRevenue}
              detail={`${orders.length} recorded orders`}
            />
            <RevenueSplit
              label="Offline"
              amount={offlineRevenue}
              total={onlineRevenue + offlineRevenue}
              detail={`${offlineSales.length} recorded sales`}
            />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-[#D8D5CB] pt-5">
            <MiniMetric label="Inventory cost" value={naira(inventoryValue(inventory))} />
            <MiniMetric
              label="Held stock"
              value={String(
                inventory.reduce(
                  (sum, style) => sum + inventoryTotals(style).held,
                  0,
                ),
              )}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel>
          <PanelHeader
            eyebrow="Owner actions"
            title="What needs a decision"
            action={<Link className="text-[12px] font-semibold text-[#60704C]" href="/admin/intake">Open intake →</Link>}
          />
          <div className="space-y-2.5">
            {intake.slice(0, 3).map((item, index) => (
              <div
                className="flex items-center gap-4 rounded-[16px] border border-[#E7E4DB] bg-[#FAF9F6] p-3.5"
                key={item.id}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white font-serif text-[15px] shadow-sm">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{item.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[#858278]">
                    Missing {item.missing.join(", ")}
                  </p>
                </div>
                <Link
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#DDDAD1] bg-white"
                  href="/admin/intake"
                >
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
            {lowStock.slice(0, 2).map((style) => {
              const totals = inventoryTotals(style);
              return (
                <button
                  className="flex w-full items-center gap-4 rounded-[16px] border border-[#E7E4DB] bg-[#FAF9F6] p-3.5 text-left"
                  key={style.id}
                  onClick={() => openStyle(style.id)}
                  type="button"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FFF6E7] text-[#9A762D]">
                    <AlertTriangle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{style.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#858278]">
                      {totals.lowStock} low-stock {totals.lowStock === 1 ? "variant" : "variants"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-[#8A887E]" />
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Live reservations"
            title="Holds about to move"
            action={<Link className="text-[12px] font-semibold text-[#60704C]" href="/admin/holds">Manage holds →</Link>}
          />
          <div className="space-y-3">
            {urgentHolds.map((hold) => {
              const style = inventory.find((item) => item.id === hold.styleId);
              const variant = style?.variants.find((item) => item.id === hold.variantId);
              const percentage = Math.max(0, Math.min(100, (hold.secondsLeft / 900) * 100));
              return (
                <div className="rounded-[16px] border border-[#E5E2D9] p-4" key={hold.id}>
                  <div className="flex items-start gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-[11px] bg-[#E6E5DF]">
                      {style ? <Image alt={style.name} fill sizes="48px" src={style.cover} className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{style?.name ?? "Inventory item"}</p>
                      <p className="mt-0.5 text-[11.5px] text-[#858278]">
                        {variant?.size} · {variant?.color} · {hold.customer}
                      </p>
                    </div>
                    <span className="font-mono text-[13px] font-semibold text-[#8B6531]">
                      {formatControlRoomTime(hold.secondsLeft)}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECE9E0]">
                    <div
                      className="h-full rounded-full bg-[#C49A51] transition-[width]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Panel>
          <PanelHeader eyebrow="Stock health" title="Where attention is building" />
          <div className="space-y-4">
            {inventory
              .filter((style) => style.status !== "archived")
              .slice(0, 5)
              .map((style) => {
                const totals = inventoryTotals(style);
                return (
                  <button
                    className="group flex w-full items-center gap-3 text-left"
                    key={style.id}
                    onClick={() => openStyle(style.id)}
                    type="button"
                  >
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-[#E7E6E0]">
                      <Image alt={style.name} fill sizes="44px" src={style.cover} className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[12.5px] font-semibold">{style.name}</p>
                        <span className="text-[11px] text-[#77756D]">{totals.available} ready</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ECEAE3]">
                        <div className="h-full rounded-full bg-[#7C8C63]" style={{ width: `${Math.max(6, totals.sellThrough)}%` }} />
                      </div>
                    </div>
                    <span className="w-10 text-right text-[11px] font-semibold text-[#60704C]">{totals.sellThrough}%</span>
                  </button>
                );
              })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Order flow"
            title="Sales moving through fulfilment"
            action={<Link className="text-[12px] font-semibold text-[#60704C]" href="/admin/orders">See all orders →</Link>}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {orders.slice(0, 4).map((order) => {
              const style = inventory.find((item) => item.id === order.styleId);
              return (
                <button
                  className="rounded-[16px] border border-[#E5E2D9] bg-[#FAF9F6] p-4 text-left transition-transform hover:-translate-y-0.5"
                  key={order.id}
                  onClick={() => openOrder(order.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[.09em] text-[#87847A]">{order.id}</p>
                      <p className="mt-1 text-[13.5px] font-semibold">{order.customer}</p>
                    </div>
                    <OrderStatusPill status={order.status} />
                  </div>
                  <p className="mt-4 line-clamp-1 text-[12px] text-[#77756D]">{style?.name ?? "Inventory item"}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#E8E5DD] pt-3">
                    <span className="text-[11.5px] text-[#858278]">{order.placedAt}</span>
                    <span className="font-serif text-[18px]">{naira(order.amount)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function InventorySection() {
  const { inventory, openNewPiece, openStyle, openOfflineSale } = useControlRoom();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | InventoryStatus>("all");
  const [mode, setMode] = useState<"all" | "unique" | "stocked">("all");
  const [view, setView] = useState<"table" | "cards">("table");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return inventory.filter((style) => {
      const matchesQuery = normalized
        ? `${style.name} ${style.category} ${style.collection} ${style.variants.map((item) => item.sku).join(" ")}`
            .toLowerCase()
            .includes(normalized)
        : true;
      const matchesStatus = status === "all" ? true : style.status === status;
      const matchesMode = mode === "all" ? true : style.stockMode === mode;
      return matchesQuery && matchesStatus && matchesMode;
    });
  }, [inventory, mode, query, status]);

  const totalUnits = inventory.reduce((sum, style) => sum + inventoryTotals(style).onHand, 0);
  const availableUnits = inventory.reduce((sum, style) => sum + inventoryTotals(style).available, 0);
  const heldUnits = inventory.reduce((sum, style) => sum + inventoryTotals(style).held, 0);
  const soldUnits = inventory.reduce((sum, style) => sum + inventoryTotals(style).sold, 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryMetric label="Units on hand" value={String(totalUnits)} detail={`${inventory.length} styles`} icon={<Boxes />} />
        <InventoryMetric label="Ready to sell" value={String(availableUnits)} detail="Excludes active holds" icon={<BadgeCheck />} />
        <InventoryMetric label="Temporarily held" value={String(heldUnits)} detail="Protected from offline sale" icon={<Clock3 />} />
        <InventoryMetric label="Units sold" value={String(soldUnits)} detail="Online and offline history" icon={<TrendingUp />} />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#DDDAD1] bg-white">
        <div className="border-b border-[#E8E5DD] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-[#7C8C63]">Inventory workspace</p>
              <h2 className="mt-1 font-serif text-[30px] font-medium">Styles, variants and every unit behind them</h2>
              <p className="mt-1 max-w-[720px] text-[12.5px] leading-[1.55] text-[#77756D]">
                A style can be one-of-one or carry many units. Open any row to manage media, pricing, variants and stock history.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#D8D5CB] bg-white px-4 text-[12.5px] font-semibold"
                onClick={() => openOfflineSale()}
                type="button"
              >
                <Store className="size-4" />
                Record offline sale
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1D241B] px-5 text-[12.5px] font-semibold text-white"
                onClick={() => openNewPiece()}
                type="button"
              >
                <Plus className="size-4" />
                Add new piece
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A887E]" />
              <span className="sr-only">Search inventory</span>
              <input
                className="h-11 w-full rounded-full border border-[#DDDAD1] bg-[#FAF9F6] pl-11 pr-4 text-[13px] outline-none focus:border-[#7C8C63]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search style, collection or SKU…"
                type="search"
                value={query}
              />
            </label>
            <FilterSelect label="Status" value={status} onChange={(value) => setStatus(value as typeof status)} options={["all", "live", "draft", "archived"]} />
            <FilterSelect label="Stock type" value={mode} onChange={(value) => setMode(value as typeof mode)} options={["all", "unique", "stocked"]} />
            <div className="flex h-11 rounded-full border border-[#DDDAD1] bg-[#FAF9F6] p-1">
              <button aria-label="Table view" aria-pressed={view === "table"} className={cn("grid size-9 place-items-center rounded-full", view === "table" && "bg-white shadow-sm")} onClick={() => setView("table")} type="button"><List className="size-4" /></button>
              <button aria-label="Card view" aria-pressed={view === "cards"} className={cn("grid size-9 place-items-center rounded-full", view === "cards" && "bg-white shadow-sm")} onClick={() => setView("cards")} type="button"><Grid2X2 className="size-4" /></button>
            </div>
          </div>
        </div>

        {filtered.length ? (
          view === "table" ? (
            <div className="divide-y divide-[#ECE9E1]">
              {filtered.map((style) => (
                <InventoryRow key={style.id} style={style} onOpen={() => openStyle(style.id)} onOffline={() => openOfflineSale(style.id)} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {filtered.map((style) => (
                <InventoryCard key={style.id} style={style} onOpen={() => openStyle(style.id)} />
              ))}
            </div>
          )
        ) : (
          <EmptyPanel icon={<Search />} title="No inventory matches this view" text="Clear a filter or search another style, collection or SKU." />
        )}
      </section>
    </div>
  );
}

export function IntakeSection() {
  const { intake, openNewPiece, openIntakeItem, moveIntake, deleteIntake } = useControlRoom();
  const stages: Array<{ key: IntakeStage; label: string; description: string }> = [
    { key: "captured", label: "Captured", description: "Photos or stock arrived; details are incomplete." },
    { key: "grading", label: "Being prepared", description: "Measurements, condition and variants are being verified." },
    { key: "ready", label: "Ready for inventory", description: "Only final pricing or publication decisions remain." },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-[#DAD7CD] bg-[linear-gradient(135deg,#F4F2EB_0%,#E9ECE2_100%)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#667252]">
              <ImagePlus className="size-4" />
              Arrival workflow
            </div>
            <h2 className="max-w-[760px] font-serif text-[36px] font-medium leading-[1.05] sm:text-[44px]">
              Intake is the work before a piece becomes inventory.
            </h2>
            <p className="mt-3 max-w-[760px] text-[13.5px] leading-[1.65] text-[#65635C]">
              Use it for photo batches, grading, measurements and variant counts. Once ready, finish the same piece in the inventory stepper—no duplicate entry.
            </p>
          </div>
          <button className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#1D241B] px-5 text-[12.5px] font-semibold text-white" onClick={() => openNewPiece()} type="button">
            <Plus className="size-4" />
            Start a clean intake
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {stages.map((stage) => {
          const items = intake.filter((item) => item.stage === stage.key);
          return (
            <div className="min-w-0 rounded-[22px] border border-[#DDDAD1] bg-[#F5F3ED] p-3.5" key={stage.key}>
              <div className="flex items-start justify-between gap-3 px-1 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold">{stage.label}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#77756D]">{items.length}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-[1.45] text-[#858278]">{stage.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <article className="rounded-[18px] border border-[#E3E0D7] bg-white p-3.5 shadow-[0_5px_20px_rgba(35,33,26,.04)]" key={item.id}>
                    <div className="flex gap-3">
                      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#E6E5DF]">
                        <Image alt={item.name} fill sizes="64px" src={item.cover} className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="line-clamp-2 text-[13px] font-semibold">{item.name}</h4>
                            <p className="mt-1 text-[11px] text-[#858278]">{item.category} · {item.expectedUnits} {item.expectedUnits === 1 ? "unit" : "units"}</p>
                          </div>
                          <button aria-label={`More actions for ${item.name}`} className="grid size-8 shrink-0 place-items-center rounded-full border border-[#E2DFD6]" type="button"><MoreHorizontal className="size-4" /></button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.missing.slice(0, 3).map((missing) => <span className="rounded-full bg-[#FFF4E1] px-2 py-1 text-[9.5px] font-semibold text-[#8B6531]" key={missing}>{missing}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#EEECE5] pt-3">
                      <span className="text-[10.5px] text-[#8A887E]">{item.owner} · {item.receivedAt}</span>
                      <div className="flex items-center gap-1.5">
                        {stage.key !== "captured" ? <button className="h-8 rounded-full border border-[#DDDAD1] px-3 text-[10.5px] font-semibold" onClick={() => moveIntake(item.id, stage.key === "ready" ? "grading" : "captured")} type="button">Back</button> : null}
                        {stage.key === "ready" ? (
                          <button className="h-8 rounded-full bg-[#1D241B] px-3 text-[10.5px] font-semibold text-white" onClick={() => openIntakeItem(item)} type="button">Finish piece</button>
                        ) : (
                          <button className="h-8 rounded-full bg-[#E9EEE1] px-3 text-[10.5px] font-semibold text-[#536044]" onClick={() => moveIntake(item.id, stage.key === "captured" ? "grading" : "ready")} type="button">Move forward</button>
                        )}
                        <button aria-label={`Remove ${item.name} from intake`} className="sr-only" onClick={() => deleteIntake(item.id)} type="button">Remove</button>
                      </div>
                    </div>
                  </article>
                ))}
                {!items.length ? <div className="rounded-[16px] border border-dashed border-[#D8D5CB] px-4 py-9 text-center text-[11.5px] text-[#8A887E]">Nothing waiting here.</div> : null}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function OrdersSection() {
  const { orders, inventory, openOrder } = useControlRoom();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = orders.filter((order) => {
    const matchesStatus = filter === "all" || order.status === filter;
    const matchesQuery = `${order.id} ${order.customer} ${order.email}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });
  const statusFilters: Array<"all" | OrderStatus> = ["all", "new", "paid", "packing", "dispatched", "delivered", "cancelled"];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <PipelineMetric label="Awaiting action" value={orders.filter((item) => item.status === "new" || item.status === "paid").length} icon={<AlertTriangle />} />
        <PipelineMetric label="Packing" value={orders.filter((item) => item.status === "packing").length} icon={<PackageOpen />} />
        <PipelineMetric label="On the way" value={orders.filter((item) => item.status === "dispatched").length} icon={<Truck />} />
        <PipelineMetric label="Delivered" value={orders.filter((item) => item.status === "delivered").length} icon={<Check />} />
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[#E7E4DB] p-4 sm:p-5">
          <PanelHeader eyebrow="Order management" title="Every sale from payment to delivery" />
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A887E]" />
              <span className="sr-only">Search orders</span>
              <input className="h-11 w-full rounded-full border border-[#DDDAD1] bg-[#FAF9F6] pl-11 pr-4 text-[13px] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or email…" type="search" value={query} />
            </label>
            <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {statusFilters.map((status) => <button aria-pressed={filter === status} className={cn("h-9 shrink-0 rounded-full px-3.5 text-[11px] font-semibold capitalize", filter === status ? "bg-[#1D241B] text-white" : "border border-[#DDDAD1] bg-white text-[#67655E]")} key={status} onClick={() => setFilter(status)} type="button">{status}</button>)}
            </div>
          </div>
        </div>

        <div className="hidden grid-cols-[1.2fr_1.2fr_.8fr_.75fr_.8fr_38px] gap-4 border-b border-[#ECE9E1] bg-[#FAF9F6] px-5 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8A887E] md:grid">
          <span>Order</span><span>Customer</span><span>Payment</span><span>Status</span><span className="text-right">Amount</span><span />
        </div>
        <div className="divide-y divide-[#ECE9E1]">
          {filtered.map((order) => {
            const style = inventory.find((item) => item.id === order.styleId);
            return (
              <button className="grid w-full gap-3 px-4 py-4 text-left hover:bg-[#FAF9F6] md:grid-cols-[1.2fr_1.2fr_.8fr_.75fr_.8fr_38px] md:items-center md:gap-4 md:px-5" key={order.id} onClick={() => openOrder(order.id)} type="button">
                <div><p className="text-[12px] font-semibold">{order.id}</p><p className="mt-1 line-clamp-1 text-[11px] text-[#858278]">{style?.name} · {order.quantity} unit</p></div>
                <div><p className="text-[12.5px] font-semibold">{order.customer}</p><p className="mt-1 text-[10.5px] text-[#858278]">{order.delivery}</p></div>
                <PaymentPill status={order.payment} />
                <OrderStatusPill status={order.status} />
                <span className="font-serif text-[18px] md:text-right">{naira(order.amount)}</span>
                <span className="hidden size-8 place-items-center rounded-full border border-[#E1DED5] md:grid"><ChevronRight className="size-4" /></span>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function HoldsSection() {
  const { holds, inventory, extendHold, releaseHold } = useControlRoom();
  const active = holds.filter((hold) => hold.secondsLeft > 0).toSorted((a, b) => a.secondsLeft - b.secondsLeft);
  const heldUnits = active.reduce((sum, hold) => sum + hold.quantity, 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
        <div className="rounded-[26px] bg-[#1D241B] p-6 text-white">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.17em] text-[#C7D0B4]">Live holds</p><p className="mt-2 font-serif text-[50px]">{active.length}</p><p className="mt-1 text-[12.5px] text-white/60">{heldUnits} units protected from sale</p></div><TimerReset className="size-8 text-[#C7D0B4]" /></div>
          <div className="mt-8 rounded-[17px] bg-white/8 p-4 text-[12px] leading-[1.55] text-white/72">Extending a hold should be deliberate. Offline sales can only use stock that is not held by a shopper.</div>
        </div>
        <Panel>
          <PanelHeader eyebrow="Reservation pressure" title="What is expiring first" />
          <div className="grid gap-3 sm:grid-cols-3">
            {active.slice(0, 3).map((hold) => {
              const style = inventory.find((item) => item.id === hold.styleId);
              return <div className="rounded-[16px] border border-[#E5E2D9] bg-[#FAF9F6] p-4" key={hold.id}><p className="line-clamp-1 text-[12px] font-semibold">{style?.name}</p><p className="mt-1 text-[10.5px] text-[#858278]">{hold.customer}</p><p className="mt-5 font-mono text-[25px] font-semibold text-[#8B6531]">{formatControlRoomTime(hold.secondsLeft)}</p></div>;
            })}
          </div>
        </Panel>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {active.map((hold) => {
          const style = inventory.find((item) => item.id === hold.styleId);
          const variant = style?.variants.find((item) => item.id === hold.variantId);
          const progress = Math.max(0, Math.min(100, (hold.secondsLeft / 900) * 100));
          return (
            <article className="rounded-[22px] border border-[#DDDAD1] bg-white p-5" key={hold.id}>
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[13px] bg-[#E6E5DF]">{style ? <Image alt={style.name} fill sizes="80px" src={style.cover} className="object-cover" /> : null}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] font-semibold">{style?.name}</p><p className="mt-1 text-[11.5px] text-[#858278]">{variant?.size} · {variant?.color} · Qty {hold.quantity}</p></div><span className="rounded-full bg-[#FFF4E1] px-3 py-1.5 font-mono text-[12px] font-semibold text-[#8B6531]">{formatControlRoomTime(hold.secondsLeft)}</span></div><p className="mt-4 text-[12.5px] font-semibold">{hold.customer}</p><p className="mt-1 text-[11px] text-[#858278]">{hold.channel} · started {hold.startedAt}</p></div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ECE9E0]"><div className="h-full rounded-full bg-[#C49A51]" style={{ width: `${progress}%` }} /></div>
              <div className="mt-4 flex flex-wrap justify-end gap-2"><button className="h-9 rounded-full border border-[#D8D5CB] px-4 text-[11.5px] font-semibold" onClick={() => releaseHold(hold.id)} type="button">Release now</button><button className="h-9 rounded-full bg-[#1D241B] px-4 text-[11.5px] font-semibold text-white" onClick={() => extendHold(hold.id)} type="button">Extend 5 minutes</button></div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function OfflineSalesSection() {
  const { offlineSales, inventory, openOfflineSale } = useControlRoom();
  const revenue = offlineSales.reduce((sum, sale) => sum + sale.amount, 0);
  const units = offlineSales.reduce((sum, sale) => sum + sale.quantity, 0);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#313B2C_0%,#1D241B_65%,#161B14_100%)] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#C7D0B4]"><Store className="size-4" />Offline counter</div><h2 className="max-w-[760px] font-serif text-[40px] font-medium leading-[1.04] sm:text-[48px]">A hand-to-hand sale should update stock and revenue once.</h2><p className="mt-3 max-w-[720px] text-[13.5px] leading-[1.6] text-white/65">Choose the exact style and variant, record quantity and actual selling price, and Laitstyle removes only available stock—not units currently held online.</p></div>
          <button className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-semibold text-[#1D241B]" onClick={() => openOfflineSale()} type="button"><Plus className="size-4" />Record offline sale</button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3"><DarkMetric label="Offline revenue" value={naira(revenue)} /><DarkMetric label="Units sold" value={String(units)} /><DarkMetric label="Channels used" value={String(new Set(offlineSales.map((sale) => sale.channel)).size)} /></div>
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="p-5"><PanelHeader eyebrow="Sales ledger" title="Recorded outside the website" /></div>
        <div className="hidden grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr] gap-4 border-y border-[#ECE9E1] bg-[#FAF9F6] px-5 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8A887E] md:grid"><span>Piece</span><span>Buyer</span><span>Channel</span><span>Payment</span><span className="text-right">Amount</span></div>
        <div className="divide-y divide-[#ECE9E1]">{offlineSales.map((sale) => { const style = inventory.find((item) => item.id === sale.styleId); const variant = style?.variants.find((item) => item.id === sale.variantId); return <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr] md:items-center md:gap-4 md:px-5" key={sale.id}><div className="flex items-center gap-3"><div className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-[#E6E5DF]">{style ? <Image alt={style.name} fill sizes="44px" src={style.cover} className="object-cover" /> : null}</div><div><p className="text-[12.5px] font-semibold">{sale.styleName}</p><p className="mt-0.5 text-[10.5px] text-[#858278]">{variant?.size} · Qty {sale.quantity} · {sale.soldAt}</p></div></div><span className="text-[12px]">{sale.buyer}</span><span className="text-[12px] text-[#67655E]">{sale.channel}</span><span className="text-[12px] text-[#67655E]">{sale.paymentMethod}</span><span className="font-serif text-[18px] md:text-right">{naira(sale.amount)}</span></div>; })}</div>
      </Panel>
    </div>
  );
}

export function CustomersSection() {
  const { customers, openCustomer } = useControlRoom();
  const [query, setQuery] = useState("");
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customer.city} ${customer.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const totalValue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3"><CustomerMetric label="Known customers" value={String(customers.length)} detail="Profiles with order history" icon={<UsersRound />} /><CustomerMetric label="Customer value" value={naira(totalValue)} detail="Combined recorded spend" icon={<CircleDollarSign />} /><CustomerMetric label="Delivery success" value={`${Math.round(customers.reduce((sum, item) => sum + item.deliverySuccess, 0) / customers.length)}%`} detail="Across customer profiles" icon={<Truck />} /></section>
      <Panel className="overflow-hidden p-0">
        <div className="p-4 sm:p-5"><PanelHeader eyebrow="Customer book" title="People, orders, payments and delivery history" /><label className="relative mt-4 block"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A887E]" /><span className="sr-only">Search customers</span><input className="h-11 w-full rounded-full border border-[#DDDAD1] bg-[#FAF9F6] pl-11 pr-4 text-[13px] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, city, phone or customer tag…" type="search" value={query} /></label></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{filtered.map((customer) => <button className="rounded-[18px] border border-[#E3E0D7] bg-[#FAF9F6] p-4 text-left transition-transform hover:-translate-y-0.5" key={customer.id} onClick={() => openCustomer(customer.id)} type="button"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-full bg-[#E8ECE1] font-serif text-[18px] text-[#596548]">{customer.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#667252]">{customer.orderCount} orders</span></div><h3 className="mt-4 text-[14px] font-semibold">{customer.name}</h3><p className="mt-1 text-[11.5px] text-[#858278]">{customer.city} · last seen {customer.lastSeen}</p><div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#E7E4DB] pt-4"><MiniMetric label="Total spent" value={naira(customer.totalSpent)} /><MiniMetric label="Delivery" value={`${customer.deliverySuccess}%`} /></div><div className="mt-4 flex flex-wrap gap-1.5">{customer.tags.slice(0,3).map((tag) => <span className="rounded-full bg-white px-2.5 py-1 text-[9.5px] font-semibold text-[#6E6C64]" key={tag}>{tag}</span>)}</div></button>)}</div>
      </Panel>
    </div>
  );
}

export function SettingsSection() {
  const [settings, setSettings] = useState({
    holdMinutes: "15",
    lowStockAlerts: true,
    orderWhatsApp: true,
    reviewRequests: true,
    pickupEnabled: true,
    payOnDelivery: true,
    autoPublish: false,
  });

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[#D9D6CC] bg-[#F0EEE8] p-6 sm:p-8"><div className="max-w-[820px]"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#667252]"><SlidersHorizontal className="size-4" />Store preferences</div><h2 className="font-serif text-[40px] font-medium leading-[1.04]">Set how Laitstyle should behave, in plain language.</h2><p className="mt-3 text-[13.5px] leading-[1.65] text-[#65635C]">No technical configuration. Choose the shopping rules, delivery promises and notifications your team should follow.</p></div></section>
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard icon={<Store />} title="Store identity" description="What shoppers and receipts see."><SettingSummary label="Store name" value="Laitstyle" /><SettingSummary label="Support email" value="care@laitstyle.ng" /><SettingSummary label="Default currency" value="Nigerian naira" /><button className="mt-4 h-10 rounded-full border border-[#D8D5CB] px-4 text-[11.5px] font-semibold" type="button">Edit store details</button></SettingsCard>
        <SettingsCard icon={<Clock3 />} title="Reservation rules" description="How long a shopper can protect stock."><label className="block"><span className="mb-2 block text-[11px] font-semibold text-[#67655E]">Standard hold duration</span><select className="h-11 w-full rounded-[10px] border border-[#DDDAD1] bg-white px-3.5 text-[12.5px]" onChange={(event) => setSettings((current) => ({ ...current, holdMinutes: event.target.value }))} value={settings.holdMinutes}><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select></label><ToggleRow checked={settings.lowStockAlerts} label="Warn me when held stock leaves a variant low" onChange={(checked) => setSettings((current) => ({ ...current, lowStockAlerts: checked }))} /></SettingsCard>
        <SettingsCard icon={<Truck />} title="Delivery experience" description="Options customers can choose at checkout."><ToggleRow checked={settings.pickupEnabled} label="Allow Lagos pickup" onChange={(checked) => setSettings((current) => ({ ...current, pickupEnabled: checked }))} /><SettingSummary label="Lagos delivery promise" value="1–2 business days" /><SettingSummary label="Interstate promise" value="3–5 business days" /><button className="mt-4 h-10 rounded-full border border-[#D8D5CB] px-4 text-[11.5px] font-semibold" type="button">Manage delivery zones</button></SettingsCard>
        <SettingsCard icon={<WalletCards />} title="Payments" description="Customer-facing payment choices."><SettingSummary label="Online checkout" value="Paystack and Flutterwave" /><ToggleRow checked={settings.payOnDelivery} label="Allow pay on delivery with deposit" onChange={(checked) => setSettings((current) => ({ ...current, payOnDelivery: checked }))} /><SettingSummary label="Offline recording" value="Cash, transfer and POS" /></SettingsCard>
        <SettingsCard icon={<MessageCircle />} title="Customer updates" description="Choose which moments deserve a message."><ToggleRow checked={settings.orderWhatsApp} label="Send WhatsApp order updates" onChange={(checked) => setSettings((current) => ({ ...current, orderWhatsApp: checked }))} /><ToggleRow checked={settings.reviewRequests} label="Ask for a review after delivery" onChange={(checked) => setSettings((current) => ({ ...current, reviewRequests: checked }))} /></SettingsCard>
        <SettingsCard icon={<UsersRound />} title="Team access" description="Who can change stock, orders and settings."><div className="space-y-3"><TeamMember initials="SO" name="Surdma O." role="Owner · full access" /><TeamMember initials="TA" name="Teni A." role="Inventory and intake" /><TeamMember initials="MO" name="Moyo O." role="Orders and customers" /></div><button className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#1D241B] px-4 text-[11.5px] font-semibold text-white" type="button"><Plus className="size-3.5" />Invite teammate</button></SettingsCard>
      </div>
    </div>
  );
}

function InventoryRow({ style, onOpen, onOffline }: { style: InventoryStyle; onOpen: () => void; onOffline: () => void }) {
  const totals = inventoryTotals(style);
  return (
    <div className="grid gap-4 px-4 py-4 sm:px-5 xl:grid-cols-[1.55fr_.7fr_.7fr_.7fr_.75fr_90px] xl:items-center">
      <button className="flex min-w-0 items-center gap-3 text-left" onClick={onOpen} type="button"><div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#E6E5DF]"><Image alt={style.name} fill sizes="56px" src={style.cover} className="object-cover" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[13.5px] font-semibold">{style.name}</h3><StockModePill mode={style.stockMode} /></div><p className="mt-1 truncate text-[11px] text-[#858278]">{style.collection} · {style.variants.length} {style.variants.length === 1 ? "variant" : "variants"}</p><p className="mt-1 text-[10.5px] text-[#A09D93]">Updated {style.updatedAt}</p></div></button>
      <InventoryNumber label="Available" value={totals.available} tone="good" />
      <InventoryNumber label="Held" value={totals.held} tone="warn" />
      <InventoryNumber label="Sold" value={totals.sold} tone="neutral" />
      <div><div className="flex items-center justify-between text-[10.5px]"><span className="text-[#858278]">Sell-through</span><span className="font-semibold">{totals.sellThrough}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ECE9E0]"><div className="h-full rounded-full bg-[#7C8C63]" style={{ width: `${Math.max(4, totals.sellThrough)}%` }} /></div></div>
      <div className="flex justify-end gap-1.5"><button aria-label={`Record offline sale for ${style.name}`} className="grid size-9 place-items-center rounded-full border border-[#DDDAD1]" disabled={totals.available === 0} onClick={onOffline} type="button"><Banknote className="size-4" /></button><button aria-label={`Open ${style.name}`} className="grid size-9 place-items-center rounded-full bg-[#1D241B] text-white" onClick={onOpen} type="button"><ChevronRight className="size-4" /></button></div>
    </div>
  );
}

function InventoryCard({ style, onOpen }: { style: InventoryStyle; onOpen: () => void }) {
  const totals = inventoryTotals(style);
  return <button className="overflow-hidden rounded-[19px] border border-[#E3E0D7] bg-[#FAF9F6] text-left" onClick={onOpen} type="button"><div className="relative aspect-[16/10] overflow-hidden bg-[#E6E5DF]"><Image alt={style.name} fill sizes="(max-width: 768px) 50vw, 30vw" src={style.cover} className="object-cover" /><div className="absolute left-3 top-3 flex gap-1.5"><StockModePill mode={style.stockMode} /><StatusPill status={style.status} /></div></div><div className="p-4"><h3 className="text-[14px] font-semibold">{style.name}</h3><p className="mt-1 text-[11px] text-[#858278]">{style.collection} · {style.variants.length} variants</p><div className="mt-4 grid grid-cols-3 gap-2"><MiniMetric label="Ready" value={String(totals.available)} /><MiniMetric label="Held" value={String(totals.held)} /><MiniMetric label="Sold" value={String(totals.sold)} /></div><div className="mt-4 flex items-center justify-between border-t border-[#E7E4DB] pt-3"><span className="font-serif text-[19px]">{naira(style.price)}</span><span className="text-[10.5px] font-semibold text-[#60704C]">{totals.sellThrough}% sold</span></div></div></button>;
}

function BriefCard({ eyebrow, title, text, icon, tone }: { eyebrow: string; title: string; text: string; icon: ReactNode; tone: "warm" | "light" | "sage" }) {
  return <div className={cn("rounded-[18px] border p-4 backdrop-blur", tone === "warm" && "border-[#E5CFA1]/25 bg-[#D8A856]/12", tone === "light" && "border-white/10 bg-white/7", tone === "sage" && "border-[#B9C7A2]/20 bg-[#7C8C63]/18")}><div className="flex items-start justify-between gap-3"><p className="text-[9.5px] font-semibold uppercase tracking-[.14em] text-white/52">{eyebrow}</p><span className="[&_svg]:size-4 text-white/62">{icon}</span></div><p className="mt-5 font-serif text-[23px]">{title}</p><p className="mt-1 text-[11px] text-white/55">{text}</p></div>;
}

function RevenueSplit({ label, amount, total, detail }: { label: string; amount: number; total: number; detail: string }) {
  const percentage = total ? Math.round((amount / total) * 100) : 0;
  return <div><div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-semibold">{label}</p><p className="mt-0.5 text-[10.5px] text-[#858278]">{detail}</p></div><div className="text-right"><p className="font-serif text-[19px]">{naira(amount)}</p><p className="text-[10px] font-semibold text-[#667252]">{percentage}%</p></div></div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#DCD9CF]"><div className="h-full rounded-full bg-[#7C8C63]" style={{ width: `${percentage}%` }} /></div></div>;
}

function Panel({ children, className }: { children: ReactNode; className?: string }) { return <section className={cn("rounded-[24px] border border-[#DDDAD1] bg-white p-5 sm:p-6", className)}>{children}</section>; }
function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10.5px] font-semibold uppercase tracking-[.16em] text-[#7C8C63]">{eyebrow}</p><h2 className="mt-1 font-serif text-[27px] font-medium leading-[1.1]">{title}</h2></div>{action}</div>; }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-[.08em] text-[#8A887E]">{label}</p><p className="mt-1 text-[12.5px] font-semibold">{value}</p></div>; }
function InventoryMetric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) { return <div className="rounded-[19px] border border-[#DDDAD1] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10.5px] font-semibold uppercase tracking-[.1em] text-[#858278]">{label}</p><p className="mt-2 font-serif text-[30px]">{value}</p><p className="mt-1 text-[10.5px] text-[#929087]">{detail}</p></div><span className="grid size-10 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-4">{icon}</span></div></div>; }
function PipelineMetric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) { return <div className="flex items-center gap-3 rounded-[18px] border border-[#DDDAD1] bg-white p-4"><span className="grid size-10 place-items-center rounded-full bg-[#F0EEE8] text-[#667252] [&_svg]:size-4">{icon}</span><div><p className="font-serif text-[27px]">{value}</p><p className="text-[10.5px] text-[#858278]">{label}</p></div></div>; }
function CustomerMetric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) { return <div className="rounded-[20px] border border-[#DDDAD1] bg-white p-5"><span className="grid size-10 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-4">{icon}</span><p className="mt-5 font-serif text-[30px]">{value}</p><p className="mt-1 text-[12px] font-semibold">{label}</p><p className="mt-1 text-[10.5px] text-[#8A887E]">{detail}</p></div>; }
function DarkMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-[17px] border border-white/10 bg-white/7 p-4"><p className="text-[10px] uppercase tracking-[.12em] text-white/45">{label}</p><p className="mt-2 font-serif text-[26px]">{value}</p></div>; }

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="relative"><span className="sr-only">{label}</span><select className="h-11 rounded-full border border-[#DDDAD1] bg-[#FAF9F6] px-4 pr-9 text-[11.5px] font-semibold capitalize outline-none" onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function InventoryNumber({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "neutral" }) { return <div className="flex items-baseline justify-between xl:block"><span className="text-[10.5px] text-[#858278] xl:block">{label}</span><span className={cn("mt-1 text-[14px] font-semibold", tone === "good" && "text-[#5F7043]", tone === "warn" && "text-[#9A762D]")}>{value}</span></div>; }
function StockModePill({ mode }: { mode: InventoryStyle["stockMode"] }) { return <span className={cn("rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.08em]", mode === "unique" ? "bg-[#F0E9E2] text-[#795E49]" : "bg-[#E8EEE1] text-[#566347]")}>{mode === "unique" ? "One of one" : "Stocked"}</span>; }
function StatusPill({ status }: { status: InventoryStatus }) { return <span className={cn("rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.08em]", status === "live" && "bg-[#E8EEE1] text-[#566347]", status === "draft" && "bg-[#FFF4E1] text-[#8B6531]", status === "archived" && "bg-[#E9E8E4] text-[#6D6B64]")}>{status}</span>; }
function PaymentPill({ status }: { status: "paid" | "pending" | "deposit" | "failed" }) { return <span className={cn("w-fit rounded-full px-2.5 py-1 text-[9.5px] font-semibold capitalize", status === "paid" && "bg-[#E8EEE1] text-[#566347]", status === "deposit" && "bg-[#E8EBF2] text-[#52617C]", status === "pending" && "bg-[#FFF4E1] text-[#8B6531]", status === "failed" && "bg-[#F8E7E4] text-[#944C43]")}>{status}</span>; }
function OrderStatusPill({ status }: { status: OrderStatus }) { return <span className={cn("w-fit rounded-full px-2.5 py-1 text-[9.5px] font-semibold capitalize", (status === "new" || status === "paid") && "bg-[#FFF4E1] text-[#8B6531]", status === "packing" && "bg-[#E8EBF2] text-[#52617C]", status === "dispatched" && "bg-[#E8EEE1] text-[#566347]", status === "delivered" && "bg-[#E4EFE8] text-[#466854]", status === "cancelled" && "bg-[#F8E7E4] text-[#944C43]")}>{status.replaceAll("-", " ")}</span>; }
function EmptyPanel({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center"><span className="grid size-14 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-5">{icon}</span><h3 className="mt-4 font-serif text-[27px]">{title}</h3><p className="mt-2 max-w-[420px] text-[12.5px] leading-[1.55] text-[#77756D]">{text}</p></div>; }
function SettingsCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) { return <section className="rounded-[22px] border border-[#DDDAD1] bg-white p-5 sm:p-6"><div className="flex items-start gap-3 border-b border-[#ECE9E1] pb-4"><span className="grid size-10 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-4">{icon}</span><div><h3 className="font-serif text-[24px]">{title}</h3><p className="mt-1 text-[11.5px] text-[#858278]">{description}</p></div></div><div className="mt-5 space-y-4">{children}</div></section>; }
function SettingSummary({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-[11.5px] text-[#77756D]">{label}</span><span className="text-right text-[12px] font-semibold">{value}</span></div>; }
function ToggleRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) { return <button aria-pressed={checked} className="flex w-full items-center justify-between gap-4 text-left" onClick={() => onChange(!checked)} type="button"><span className="text-[11.5px] text-[#77756D]">{label}</span><span className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-[#667252]" : "bg-[#D7D4CA]")}><span className={cn("absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-6" : "translate-x-1")} /></span></button>; }
function TeamMember({ initials, name, role }: { initials: string; name: string; role: string }) { return <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#F0EEE8] font-serif text-[13px]">{initials}</span><div className="min-w-0"><p className="text-[12px] font-semibold">{name}</p><p className="mt-0.5 text-[10.5px] text-[#858278]">{role}</p></div></div>; }
