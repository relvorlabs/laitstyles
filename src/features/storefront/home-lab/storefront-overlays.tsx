"use client";

import type { CSSProperties, FormEvent, MouseEvent } from "react";
import {
  filterCategories,
  inventoryLabel,
  measurementsCm,
  money,
  type Product,
  products,
  sortOptions,
} from "./data";
import { IconClose, IconHeart, IconSearch } from "./icons";
import { useStorefront } from "./storefront-context";

const searchSuggestions: [string, string][] = [
  ["Levi's", "Levi’s denim"],
  ["Grade A+", "Grade A+"],
  ["Jacket", "Jackets"],
  ["Vintage", "Vintage"],
];

// Shared overlay suite + toast for every .lst-lab route (search, quick view, image
// viewer, saved, cart, filters, sort, guide modals). Ported from storefront.html.
export function StorefrontOverlays() {
  const s = useStorefront();
  const overlayBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) s.closeAll();
  };

  const viewerProduct = s.activeProduct ?? products[0];
  const viewerLabels = [
    "Front view",
    "Back view",
    "Fabric detail",
    "Brand or care label",
    viewerProduct.flaw !== "None" ? "Disclosed detail" : "Styled view",
  ];
  const active = s.activeProduct;

  const onDeliverySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const area = new FormData(e.currentTarget).get("area")?.toString().trim() ?? "";
    s.setDeliveryStatus(
      area.length < 3
        ? "Enter a valid state or delivery area."
        : `Estimated delivery to ${area}: 2–5 business days. Final fee is confirmed at checkout.`,
    );
  };
  const onSupportSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    s.closeAll();
    s.showToast("Your question has been recorded.");
  };

  return (
    <>
      {/* Search — hand-rolled overlay (see 2-3N-OVL: shadcn Dialog migration blocked by a
          Base UI Popup that does not unmount on close → leftover full-screen overlay freezes
          the page. Reverted until the shared dialog.tsx/sheet.tsx unmount bug is fixed). */}
      <div
        id="searchModal"
        className={`overlay modal-wrap${s.openId === "searchModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search the rack"
        onClick={overlayBackdrop}
      >
        <section className="modal search-modal">
          <div className="modal-head">
            <h2>Search the rack</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close search"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          {/* BLOCKER 2-3N-01: search internals → Tailwind. Shared kept: eyebrow, control-button, search-empty, price. */}
          <div className="relative mt-5">
            <label className="eyebrow" htmlFor="searchInput">
              Product, brand, category or grade
            </label>
            <input
              id="searchInput"
              className="min-h-[66px] w-full border-0 border-b border-[var(--line-strong)] bg-transparent pr-[52px] text-[1.35rem]"
              autoComplete="off"
              placeholder="Try “Levi’s denim”"
              value={s.searchValue}
              onChange={(e) => s.setSearchValue(e.target.value)}
            />
            <IconSearch className="absolute right-[14px] top-[22px] h-5 w-5 text-[var(--muted)]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {searchSuggestions.map(([term, label]) => (
              <button
                key={term}
                className="control-button"
                type="button"
                onClick={() => s.setSearchValue(term)}
              >
                {label}
              </button>
            ))}
          </div>
          <div id="searchResults" className="mt-6 grid gap-2.5">
            {s.searchResults === null ? (
              <div className="search-empty">
                Start typing to search products, brands, categories or condition grades.
              </div>
            ) : s.searchResults.length ? (
              s.searchResults.map((p) => (
                <button
                  key={p.id}
                  className="grid grid-cols-[74px_1fr_auto] items-center gap-[14px] rounded-[5px] border border-[var(--line)] bg-transparent p-2 text-left hover:bg-[var(--bone-2)] max-[600px]:grid-cols-[64px_1fr]"
                  type="button"
                  onClick={() => s.openQuick(p.id)}
                >
                  <img
                    src={p.images[0]}
                    alt=""
                    className="h-[92px] w-[74px] rounded-[4px] object-cover max-[600px]:h-20 max-[600px]:w-16"
                  />
                  <span>
                    <h3 className="m-0 text-[0.92rem]">{p.name}</h3>
                    <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                      Size {p.size} · Grade {p.condition} · {p.status}
                    </p>
                  </span>
                  <span className="price max-[600px]:col-start-2">{money(p.price)}</span>
                </button>
              ))
            ) : (
              <div className="search-empty">
                <strong>No matching pieces.</strong>
                <br />
                Try a broader product or category name.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick view */}
      <div
        id="quickView"
        className={`overlay modal-wrap${s.openId === "quickView" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Product quick view"
        onClick={overlayBackdrop}
      >
        <section className="modal">
          <div className="modal-head">
            <span className="eyebrow">Product quick view</span>
            <button
              className="close-button"
              type="button"
              aria-label="Close quick view"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          {active && (
            <div id="quickBody">
              {/* BLOCKER 2-3N-01: quick-view + image-viewer internals → Tailwind. Shared kept: badge*, price, button*, eyebrow, overlay/modal/close-button, image-modal (modifier width). */}
              <div className="mt-[22px] grid grid-cols-[1.05fr_0.95fr] gap-[34px] max-[860px]:grid-cols-1 max-[600px]:gap-[18px]">
                <div>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)]">
                    <img
                      src={active.images[s.imageIndex]}
                      alt={`${active.name}, front view`}
                      className="h-full w-full object-cover [filter:saturate(0.74)]"
                    />
                    <button
                      type="button"
                      aria-label="Open image viewer"
                      className="absolute inset-0 border-0 bg-transparent"
                      onClick={() => s.openViewer(s.imageIndex)}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {active.images.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        className={`aspect-square overflow-hidden rounded-[4px] border bg-[var(--linen)] p-0 ${i === s.imageIndex ? "border-[var(--ink)]" : "border-transparent"}`}
                        type="button"
                        aria-label={`View image ${i + 1}`}
                        onClick={() => s.setImageIndex(i)}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="py-1.5">
                  <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    <span
                      className={`badge${active.inventory === "one-of-one" ? " badge-solid" : ""}`}
                    >
                      {inventoryLabel(active.inventory)}
                    </span>
                    <button
                      className={`badge${active.condition === "A+" ? " badge-sage" : ""}`}
                      type="button"
                      onClick={() => s.open("conditionModal")}
                    >
                      Grade {active.condition}
                    </button>
                    <button className="badge" type="button" onClick={() => s.open("authModal")}>
                      {active.brandStatus}
                    </button>
                  </div>
                  <h2
                    id="quickTitle"
                    className="mt-3.5 text-[clamp(2rem,4vw,4rem)] font-[560] leading-[0.95] tracking-[-0.04em] max-[600px]:text-[2.35rem]"
                  >
                    {active.name}
                  </h2>
                  <p className="mt-2.5 text-[0.85rem] text-[var(--muted)]">
                    {active.brand} · {active.category} · {active.style}
                  </p>
                  <p className="price mt-[22px] text-[1.2rem]">{money(active.price)}</p>
                  <p className="mt-5 max-w-[31rem] text-[var(--ink-soft)]">
                    {active.inventory === "one-of-one"
                      ? "You are buying the exact piece shown in these photographs."
                      : active.inventory === "variant"
                        ? "Choose your available size before adding this piece to the bag."
                        : "Several matching units of this product are currently available."}
                  </p>
                  <div className="mt-[22px] grid grid-cols-2 gap-2">
                    {(
                      [
                        ["Tagged size", active.size],
                        ["Recommended fit", active.fit],
                        ["Condition", `Grade ${active.condition}`],
                        ["Material", active.material],
                      ] as [string, string][]
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[4px] border border-[var(--line)] p-[13px]"
                      >
                        <span className="block text-[0.68rem] text-[var(--muted)]">{label}</span>
                        <strong className="mt-[3px] block text-[0.87rem]">{value}</strong>
                      </div>
                    ))}
                  </div>
                  {active.inventory === "variant" && active.variants ? (
                    <div className="mt-[23px]">
                      <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                        <strong>Select size</strong>
                        <button
                          className="border-0 bg-transparent text-[var(--muted)] underline"
                          type="button"
                          onClick={() => s.open("measureModal")}
                        >
                          Size guide
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {active.variants.map((v, i) => {
                          const disabled =
                            i === (active.variants?.length ?? 0) - 1 && active.stock < 5;
                          return (
                            <button
                              key={v}
                              className={`min-h-11 min-w-12 rounded-[4px] border px-3 disabled:cursor-not-allowed disabled:bg-[var(--bone-2)] disabled:text-[#9f9b91] disabled:line-through ${s.selectedVariant === v ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)]" : "border-[var(--line)] bg-transparent"}`}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                s.setSelectedVariant(v);
                                s.setQuickError("");
                              }}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                      <p
                        id="quickError"
                        className="mt-[7px] min-h-[19px] text-[0.75rem] text-[var(--error)]"
                      >
                        {s.quickError}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-[23px]">
                      <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                        <strong>Fit details</strong>
                        <button
                          className="border-0 bg-transparent text-[var(--muted)] underline"
                          type="button"
                          onClick={() => s.open("measureModal")}
                        >
                          View measurements
                        </button>
                      </div>
                    </div>
                  )}
                  {active.flaw !== "None" && (
                    <button
                      className="mt-[18px] border-l-[3px] border-l-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-[13px] text-left text-[0.78rem]"
                      type="button"
                      onClick={() => s.openViewer(4)}
                    >
                      <strong>Disclosed detail:</strong> {active.flaw}. <u>View detail image</u>
                    </button>
                  )}
                  <div className="mt-6 grid grid-cols-[1fr_auto] gap-2 max-[600px]:grid-cols-[1fr_48px]">
                    <button
                      className="button button-primary w-full"
                      type="button"
                      disabled={active.status !== "available"}
                      onClick={() => s.addFromQuick(active.id)}
                    >
                      {active.status === "available" ? "Add to bag" : active.status}
                    </button>
                    <button
                      className={`grid size-12 place-items-center rounded-[4px] border border-[var(--line-strong)] bg-transparent ${s.saved.has(active.id) ? "text-[var(--oxblood)]" : ""}`}
                      type="button"
                      aria-label="Save product"
                      onClick={() => s.toggleSaved(active.id)}
                    >
                      <IconHeart filled={s.saved.has(active.id)} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Image viewer */}
      <div
        id="imageViewer"
        className={`overlay modal-wrap${s.openId === "imageViewer" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Product images"
        onClick={overlayBackdrop}
      >
        <section className="modal image-modal">
          <div className="modal-head">
            <h2>Product images</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close image viewer"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <div className="mt-4 grid h-[calc(100%-72px)] grid-cols-[92px_1fr] gap-[14px] max-[600px]:grid-cols-1 max-[600px]:grid-rows-[1fr_auto]">
            <div
              id="viewerThumbs"
              className="grid content-start gap-2 overflow-auto max-[600px]:order-2 max-[600px]:auto-cols-[72px] max-[600px]:grid-flow-col max-[600px]:overflow-x-auto"
            >
              {viewerProduct.images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  className={`aspect-[4/5] overflow-hidden rounded-[4px] border bg-[var(--linen)] p-0 ${i === s.imageIndex ? "border-[var(--ink)]" : "border-transparent"}`}
                  type="button"
                  aria-label={viewerLabels[i]}
                  onClick={() => {
                    s.setImageIndex(i);
                    s.setZoom(1);
                  }}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div
              id="viewerMain"
              className="relative grid min-h-0 place-items-center overflow-hidden rounded-[5px] bg-[var(--bone-2)]"
              style={{ "--zoom": s.zoom } as CSSProperties}
            >
              <img
                id="viewerImage"
                src={viewerProduct.images[s.imageIndex]}
                alt={`${viewerProduct.name}, ${viewerLabels[s.imageIndex]?.toLowerCase()}`}
                className="h-auto max-h-full w-auto max-w-full object-contain [transform:scale(var(--zoom,1))] [transition:transform_220ms_var(--ease)]"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                <div className="flex gap-[7px]">
                  <button
                    className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[rgba(243,240,232,0.9)] backdrop-blur-[10px]"
                    id="prevImage"
                    type="button"
                    aria-label="Previous image"
                    onClick={() => {
                      s.setImageIndex(
                        (i) => (i - 1 + viewerProduct.images.length) % viewerProduct.images.length,
                      );
                      s.setZoom(1);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[rgba(243,240,232,0.9)] backdrop-blur-[10px]"
                    id="nextImage"
                    type="button"
                    aria-label="Next image"
                    onClick={() => {
                      s.setImageIndex((i) => (i + 1) % viewerProduct.images.length);
                      s.setZoom(1);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <span
                  id="viewerCount"
                  className="rounded-full bg-[rgba(243,240,232,0.9)] px-[13px] py-2.5 font-mono text-[0.7rem] font-medium leading-none"
                >
                  {s.imageIndex + 1} / {viewerProduct.images.length}
                </span>
                <div className="flex gap-[7px]">
                  <button
                    className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[rgba(243,240,232,0.9)] backdrop-blur-[10px]"
                    id="zoomOut"
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => s.setZoom((z) => Math.max(1, z - 0.25))}
                  >
                    −
                  </button>
                  <button
                    className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[rgba(243,240,232,0.9)] backdrop-blur-[10px]"
                    id="zoomIn"
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => s.setZoom((z) => Math.min(2.2, z + 0.25))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Saved */}
      <div
        id="savedDrawer"
        className={`overlay${s.openId === "savedDrawer" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Saved items"
        onClick={overlayBackdrop}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <h2>Saved items</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close saved items"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          {/* BLOCKER 2-3N-01: drawer content → Tailwind. Shared kept: price, button*, inventory-note. */}
          <div id="savedList" className="mt-5 grid gap-3">
            {s.savedList.length ? (
              s.savedList.map((p) => (
                <article
                  key={p.id}
                  className="grid grid-cols-[94px_1fr] gap-[13px] border-b border-[var(--line)] pb-[14px]"
                >
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="h-[118px] w-[94px] rounded-[4px] object-cover"
                  />
                  <div>
                    <div className="flex justify-between gap-3">
                      <h3 className="m-0 text-[0.9rem] leading-[1.25]">{p.name}</h3>
                      <button
                        className="h-7 w-7 border-0 bg-transparent p-0"
                        type="button"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => s.toggleSaved(p.id)}
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                      Size {p.size} · Grade {p.condition} · {p.status}
                    </p>
                    <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">{money(p.price)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        className="border-0 bg-transparent p-0 text-[0.72rem] underline"
                        type="button"
                        onClick={() => s.openQuick(p.id)}
                      >
                        View details
                      </button>
                      {p.status === "available" ? (
                        <button
                          className="button"
                          style={{ minHeight: "38px", paddingInline: "12px" }}
                          type="button"
                          onClick={() =>
                            p.inventory === "variant" ? s.openQuick(p.id) : s.addToCart(p.id)
                          }
                        >
                          {p.inventory === "variant" ? "Choose size" : "Add to bag"}
                        </button>
                      ) : (
                        <button
                          className="border-0 bg-transparent p-0 text-[0.72rem] underline"
                          type="button"
                          onClick={() => s.applyShop({ collection: "one-of-one" })}
                        >
                          Find similar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-2.5 py-[66px] text-center">
                <div className="mx-auto mb-5 grid size-[78px] place-items-center rounded-full border border-[var(--line)]">
                  <IconHeart className="[stroke-width:1.25]" style={{ width: 28, height: 28 }} />
                </div>
                <h3 className="m-0 text-[1.5rem]">No saved pieces yet</h3>
                <p className="mx-auto mb-[22px] mt-2.5 max-w-[20rem] text-[var(--muted)]">
                  Tap the heart on any product to keep it close.
                </p>
                <button className="button button-primary" type="button" onClick={s.closeAll}>
                  Browse products
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Cart */}
      <div
        id="legacyCartDrawer"
        className="overlay"
        hidden
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        onClick={overlayBackdrop}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <h2>Shopping bag</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close shopping bag"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <div id="cartList" className="mt-5 grid gap-3">
            {s.cartLines.length ? (
              s.cartLines.map(({ product: p, lineQty, variant }) => (
                <article
                  key={p.id}
                  className="grid grid-cols-[94px_1fr] gap-[13px] border-b border-[var(--line)] pb-[14px]"
                >
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="h-[118px] w-[94px] rounded-[4px] object-cover"
                  />
                  <div>
                    <div className="flex justify-between gap-3">
                      <h3 className="m-0 text-[0.9rem] leading-[1.25]">{p.name}</h3>
                      <button
                        className="h-7 w-7 border-0 bg-transparent p-0"
                        type="button"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => s.removeFromCart(p.id)}
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                      {variant ? `Size ${variant} · ` : ""}
                      {inventoryLabel(p.inventory)} · Grade {p.condition}
                    </p>
                    <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">{money(p.price)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {p.inventory === "one-of-one" ? (
                        <span className="inventory-note">Quantity 1</span>
                      ) : (
                        <div className="inline-grid grid-cols-[34px_38px_34px] overflow-hidden rounded-[4px] border border-[var(--line)]">
                          <button
                            className="h-[34px] border-0 bg-transparent"
                            type="button"
                            onClick={() => s.changeQty(p.id, -1)}
                          >
                            −
                          </button>
                          <span className="grid place-items-center border-x border-[var(--line)] text-[0.78rem]">
                            {lineQty}
                          </span>
                          <button
                            className="h-[34px] border-0 bg-transparent"
                            type="button"
                            onClick={() => s.changeQty(p.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <button
                        className="border-0 bg-transparent p-0 text-[0.72rem] underline"
                        type="button"
                        onClick={() => s.toggleSaved(p.id)}
                      >
                        Move to saved
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-2.5 py-[66px] text-center">
                <div className="mx-auto mb-5 grid size-[78px] place-items-center rounded-full border border-[var(--line)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="h-7 w-7 [stroke-width:1.25]"
                  >
                    <path d="M6 7h12l1 13H5L6 7Z" />
                    <path d="M9 9V6a3 3 0 0 1 6 0v3" />
                  </svg>
                </div>
                <h3 className="m-0 text-[1.5rem]">Your bag is empty</h3>
                <p className="mx-auto mb-[22px] mt-2.5 max-w-[20rem] text-[var(--muted)]">
                  Start with the latest drop or choose a one-of-one piece.
                </p>
                <button className="button button-primary" type="button" onClick={s.closeAll}>
                  Continue shopping
                </button>
              </div>
            )}
          </div>
          <div
            id="cartSummary"
            className="sticky bottom-[-24px] -mx-6 -mb-6 mt-7 border-t border-[var(--line)] bg-[var(--bone)] px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 max-[600px]:-mx-[18px] max-[600px]:-mb-[18px] max-[600px]:px-[18px]"
          >
            <div className="flex justify-between gap-5">
              <span>Subtotal</span>
              <strong id="subtotal" className="price">
                {money(s.subtotal)}
              </strong>
            </div>
            <p className="mb-4 mt-2 text-[0.75rem] text-[var(--muted)]">
              Delivery is calculated from your state and location.
            </p>
            <button
              id="checkoutButton"
              className="button button-primary"
              type="button"
              style={{ width: "100%" }}
              disabled={!s.cartLines.length}
              onClick={() =>
                s.showToast("Checkout is represented as the next flow in this prototype.")
              }
            >
              Continue to checkout
            </button>
          </div>
        </aside>
      </div>

      {/* Filters */}
      <div
        id="filterDrawer"
        className={`overlay${s.openId === "filterDrawer" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        onClick={overlayBackdrop}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <h2>Filter products</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close filters"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <div id="filterContent">
            <FilterControls />
          </div>
          <div className="filter-footer">
            <button className="button" type="button" onClick={s.clearFilters}>
              Clear all
            </button>
            <button className="button button-primary" type="button" onClick={s.closeAll}>
              Show products
            </button>
          </div>
        </aside>
      </div>

      {/* Sort */}
      <div
        id="sortSheet"
        className={`overlay modal-wrap${s.openId === "sortSheet" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Sort products"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Sort products</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close sort options"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <div id="sortOptions" className="mt-[18px] grid gap-2.5">
            {sortOptions.map(([v, l]) => (
              <button
                key={v}
                className="guide-card"
                type="button"
                style={{
                  textAlign: "left",
                  background: s.sort === v ? "var(--ink)" : "transparent",
                  color: s.sort === v ? "var(--bone)" : "inherit",
                }}
                onClick={() => {
                  s.setSort(v);
                  s.closeAll();
                }}
              >
                <strong>{l}</strong>
                {s.sort === v ? <span style={{ float: "right" }}>✓</span> : null}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Condition guide */}
      <div
        id="conditionModal"
        className={`overlay modal-wrap${s.openId === "conditionModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Condition guide"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Condition guide</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close condition guide"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade A+ — Like new</h3>
                <span className="badge badge-sage">A+</span>
              </div>
              <p>
                Minimal or no visible wear. No stains, structural damage, stretched areas or damaged
                fastenings.
              </p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade A — Excellent</h3>
                <span className="badge">A</span>
              </div>
              <p>
                Very light signs of normal use while remaining highly presentable and ready to wear.
              </p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4">
                <h3>Grade B+ — Good</h3>
                <span className="badge">B+</span>
              </div>
              <p>A wearable piece with a minor flaw photographed and described before purchase.</p>
            </article>
          </div>
        </section>
      </div>

      {/* Measurements */}
      <div
        id="measureModal"
        className={`overlay modal-wrap${s.openId === "measureModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Measurements and fit"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Measurements and fit</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close measurements"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: ".84rem" }}>
            Pre-owned garments may fit differently from their tagged size. Compare these
            measurements with a similar piece you already own.
          </p>
          <div className="measure-grid">
            <div className="measure-illustration">
              <div className="garment-shape" />
            </div>
            <div>
              <div className="unit-switch">
                <button
                  className={s.measureUnit === "cm" ? "active" : ""}
                  type="button"
                  onClick={() => s.setMeasureUnit("cm")}
                >
                  Centimetres
                </button>
                <button
                  className={s.measureUnit === "in" ? "active" : ""}
                  type="button"
                  onClick={() => s.setMeasureUnit("in")}
                >
                  Inches
                </button>
              </div>
              <dl id="measureList" className="measure-table">
                {Object.entries(measurementsCm).map(([k, v]) => (
                  <div key={k} className="measure-row">
                    <dt>{k}</dt>
                    <dd className="mono">
                      {s.measureUnit === "cm" ? `${v} cm` : `${(v / 2.54).toFixed(1)} in`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </div>

      {/* Delivery */}
      <div
        id="deliveryModal"
        className={`overlay modal-wrap${s.openId === "deliveryModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Delivery estimate"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Delivery estimate</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close delivery estimate"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <form id="deliveryForm" style={{ marginTop: "20px" }} onSubmit={onDeliverySubmit}>
            <div className="field">
              <label htmlFor="deliveryArea">State or delivery area</label>
              <input id="deliveryArea" name="area" required placeholder="e.g. Lagos" />
            </div>
            <button className="button button-primary" type="submit" style={{ marginTop: "12px" }}>
              Check estimate
            </button>
            <p id="deliveryStatus" style={{ fontSize: ".8rem" }} aria-live="polite">
              {s.deliveryStatus}
            </p>
          </form>
        </section>
      </div>

      {/* Authenticity */}
      <div
        id="authModal"
        className={`overlay modal-wrap${s.openId === "authModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Brand labelling"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Brand labelling</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close brand labelling"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            <article className="guide-card">
              <h3>Branded</h3>
              <p>
                A recognised label is visible on the garment. This is not automatically an
                independent authenticity claim.
              </p>
            </article>
            <article className="guide-card">
              <h3>Unverified</h3>
              <p>Branding is visible, but authenticity has not been independently confirmed.</p>
            </article>
            <article className="guide-card">
              <h3>Designer-inspired</h3>
              <p>The piece references a design language without claiming a specific origin.</p>
            </article>
            <article className="guide-card">
              <h3>Unbranded</h3>
              <p>Selected for fabric, fit, condition and everyday usefulness.</p>
            </article>
          </div>
        </section>
      </div>

      {/* Support */}
      <div
        id="supportModal"
        className={`overlay modal-wrap${s.openId === "supportModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ask about a product"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Ask about a product</h2>
            <button
              className="close-button"
              type="button"
              aria-label="Close support form"
              onClick={s.closeAll}
            >
              <IconClose />
            </button>
          </div>
          <form
            id="supportForm"
            style={{ marginTop: "20px", display: "grid", gap: "14px" }}
            onSubmit={onSupportSubmit}
          >
            <div className="field">
              <label htmlFor="supportTopic">Topic</label>
              <select id="supportTopic" defaultValue="Measurements">
                <option>Measurements</option>
                <option>Condition or flaw</option>
                <option>Delivery</option>
                <option>Return eligibility</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="supportMessage">Message</label>
              <textarea id="supportMessage" required rows={5} style={{ padding: "12px" }} />
            </div>
            <button className="button button-primary" type="submit">
              Send question
            </button>
          </form>
        </section>
      </div>

    </>
  );
}

// The filter body reused by both the shared filter drawer (mobile) and the products
// desktop sidebar. Ported from renderFilters() in storefront.html / inventory.html.
export function FilterControls() {
  const s = useStorefront();
  const countByCategory = (v: string) =>
    products.filter((p) => p.category === v || p.type === v).length;
  const inventoryRows: [string, string][] = [
    ["one-of-one", "One-of-one"],
    ["variant", "Variants"],
    ["matching-stock", "Multiple units"],
  ];
  return (
    <>
      <section className="filter-section">
        <h3>Category</h3>
        <div className="filter-options">
          <label className="check">
            <span>
              <input
                type="radio"
                name="categoryFilter"
                value="All"
                checked={s.category === "All"}
                onChange={() => {
                  s.setCategory("All");
                  s.setCollection(null);
                }}
              />{" "}
              All products
            </span>
            <span className="check-count">{products.length}</span>
          </label>
          {filterCategories.map((v) => (
            <label key={v} className="check">
              <span>
                <input
                  type="radio"
                  name="categoryFilter"
                  value={v}
                  checked={s.category === v}
                  onChange={() => {
                    s.setCategory(v);
                    s.setCollection(null);
                  }}
                />{" "}
                {v}
              </span>
              <span className="check-count">{countByCategory(v)}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Condition</h3>
        <div className="filter-options">
          {["A+", "A", "B+"].map((v) => (
            <label key={v} className="check">
              <span>
                <input
                  type="checkbox"
                  value={v}
                  checked={s.conditions.has(v)}
                  onChange={(e) =>
                    s.setConditions((prev) => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(v);
                      else n.delete(v);
                      return n;
                    })
                  }
                />{" "}
                Grade {v}
              </span>
              <span className="check-count">
                {products.filter((p) => p.condition === v).length}
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Inventory</h3>
        <div className="filter-options">
          {inventoryRows.map(([v, l]) => (
            <label key={v} className="check">
              <span>
                <input
                  type="checkbox"
                  value={v}
                  checked={s.inventories.has(v)}
                  onChange={(e) =>
                    s.setInventories((prev) => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(v);
                      else n.delete(v);
                      return n;
                    })
                  }
                />{" "}
                {l}
              </span>
              <span className="check-count">
                {products.filter((p) => p.inventory === (v as Product["inventory"])).length}
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Price</h3>
        <div className="price-range">
          <button className="control-button" type="button" onClick={() => s.setMaxPrice(25000)}>
            Under ₦25k
          </button>
          <button className="control-button" type="button" onClick={() => s.setMaxPrice(40000)}>
            Under ₦40k
          </button>
        </div>
      </section>
      <section className="filter-section">
        <label className="check">
          <span>
            <input
              type="checkbox"
              checked={s.inStock}
              onChange={(e) => s.setInStock(e.target.checked)}
            />{" "}
            In stock only
          </span>
          <span className="check-count">
            {products.filter((p) => p.status === "available").length}
          </span>
        </label>
      </section>
    </>
  );
}
