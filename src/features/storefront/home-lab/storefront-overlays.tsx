"use client";

import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
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

const closeButtonClass = "close-button";
const viewerControlClass =
  "size-11 rounded-full border border-[var(--line)] bg-[rgba(243,240,232,0.9)] p-0 text-[var(--ink)] backdrop-blur-[10px] hover:bg-white";

export function StorefrontOverlays() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };

  const viewerProduct = storefront.activeProduct ?? products[0];
  const viewerLabels = [
    "Front view",
    "Back view",
    "Fabric detail",
    "Brand or care label",
    viewerProduct.flaw !== "None" ? "Disclosed detail" : "Styled view",
  ];
  const active = storefront.activeProduct;

  const onDeliverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const area = new FormData(event.currentTarget).get("area")?.toString().trim() ?? "";
    storefront.setDeliveryStatus(
      area.length < 3
        ? "Enter a valid state or delivery area."
        : `Estimated delivery to ${area}: 2–5 business days. Final fee is confirmed at checkout.`,
    );
  };

  const onSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    storefront.closeAll();
    storefront.showToast("Your question has been recorded.");
  };

  return (
    <>
      <div
        id="searchModal"
        className={`overlay modal-wrap${storefront.openId === "searchModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search the rack"
        onClick={overlayBackdrop}
      >
        <section className="modal search-modal">
          <div className="modal-head">
            <h2>Search the rack</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close search"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div className="relative mt-5">
            <label className="eyebrow" htmlFor="searchInput">
              Product, brand, category or grade
            </label>
            <input
              id="searchInput"
              className="min-h-[66px] w-full border-0 border-b border-[var(--line-strong)] bg-transparent pr-[52px] text-[1.35rem]"
              autoComplete="off"
              placeholder="Try “Levi’s denim”"
              value={storefront.searchValue}
              onChange={(event) => storefront.setSearchValue(event.target.value)}
            />
            <IconSearch className="absolute right-[14px] top-[22px] h-5 w-5 text-[var(--muted)]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {searchSuggestions.map(([term, label]) => (
              <Button
                key={term}
                className="control-button"
                type="button"
                onClick={() => storefront.setSearchValue(term)}
                variant="outline"
              >
                {label}
              </Button>
            ))}
          </div>
          <div id="searchResults" className="mt-6 grid gap-2.5">
            {storefront.searchResults === null ? (
              <div className="search-empty">
                Start typing to search products, brands, categories or condition grades.
              </div>
            ) : storefront.searchResults.length ? (
              storefront.searchResults.map((product) => (
                <Button
                  key={product.id}
                  className="grid h-auto w-full grid-cols-[74px_1fr_auto] items-center justify-stretch gap-[14px] rounded-[5px] border border-[var(--line)] bg-transparent p-2 text-left hover:bg-[var(--bone-2)] max-[600px]:grid-cols-[64px_1fr]"
                  type="button"
                  onClick={() => storefront.openQuick(product.id)}
                  variant="ghost"
                >
                  <img
                    src={product.images[0]}
                    alt=""
                    className="h-[92px] w-[74px] rounded-[4px] object-cover max-[600px]:h-20 max-[600px]:w-16"
                  />
                  <span>
                    <h3 className="m-0 text-[0.92rem]">{product.name}</h3>
                    <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                      Size {product.size} · Grade {product.condition} · {product.status}
                    </p>
                  </span>
                  <span className="price max-[600px]:col-start-2">{money(product.price)}</span>
                </Button>
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

      <div
        id="quickView"
        className={`overlay modal-wrap${storefront.openId === "quickView" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Product quick view"
        onClick={overlayBackdrop}
      >
        <section className="modal">
          <div className="modal-head">
            <span className="eyebrow">Product quick view</span>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close quick view"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          {active ? (
            <div id="quickBody">
              <div className="mt-[22px] grid grid-cols-[1.05fr_0.95fr] gap-[34px] max-[860px]:grid-cols-1 max-[600px]:gap-[18px]">
                <div>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[var(--linen)]">
                    <img
                      src={active.images[storefront.imageIndex]}
                      alt={`${active.name}, front view`}
                      className="h-full w-full object-cover [filter:saturate(0.74)]"
                    />
                    <Button
                      type="button"
                      aria-label="Open image viewer"
                      className="absolute inset-0 size-full rounded-none border-0 bg-transparent p-0"
                      onClick={() => storefront.openViewer(storefront.imageIndex)}
                      variant="ghost"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {active.images.map((src, index) => (
                      <Button
                        key={`${src}-${index}`}
                        className={`aspect-square h-auto overflow-hidden rounded-[4px] border bg-[var(--linen)] p-0 ${
                          index === storefront.imageIndex
                            ? "border-[var(--ink)]"
                            : "border-transparent"
                        }`}
                        type="button"
                        aria-label={`View image ${index + 1}`}
                        aria-pressed={index === storefront.imageIndex}
                        onClick={() => storefront.setImageIndex(index)}
                        variant="ghost"
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="py-1.5">
                  <div className="flex flex-wrap gap-[7px]">
                    <span className={`badge${active.inventory === "one-of-one" ? " badge-solid" : ""}`}>
                      {inventoryLabel(active.inventory)}
                    </span>
                    <Button
                      className={`badge h-auto rounded-full p-0${
                        active.condition === "A+" ? " badge-sage" : ""
                      }`}
                      type="button"
                      onClick={() => storefront.open("conditionModal")}
                      variant="ghost"
                    >
                      Grade {active.condition}
                    </Button>
                    <Button
                      className="badge h-auto rounded-full p-0"
                      type="button"
                      onClick={() => storefront.open("authModal")}
                      variant="ghost"
                    >
                      {active.brandStatus}
                    </Button>
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
                      <div key={label} className="rounded-[4px] border border-[var(--line)] p-[13px]">
                        <span className="block text-[0.68rem] text-[var(--muted)]">{label}</span>
                        <strong className="mt-[3px] block text-[0.87rem]">{value}</strong>
                      </div>
                    ))}
                  </div>
                  {active.inventory === "variant" && active.variants ? (
                    <div className="mt-[23px]">
                      <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                        <strong>Select size</strong>
                        <Button
                          className="h-auto p-0 text-[var(--muted)]"
                          type="button"
                          onClick={() => storefront.open("measureModal")}
                          variant="link"
                        >
                          Size guide
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {active.variants.map((variant, index) => {
                          const disabled =
                            index === (active.variants?.length ?? 0) - 1 && active.stock < 5;
                          const selected = storefront.selectedVariant === variant;
                          return (
                            <Button
                              key={variant}
                              className={`min-h-11 min-w-12 rounded-[4px] border px-3 disabled:cursor-not-allowed disabled:bg-[var(--bone-2)] disabled:text-[#9f9b91] disabled:line-through ${
                                selected
                                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bone)] hover:bg-[var(--ink)]"
                                  : "border-[var(--line)] bg-transparent"
                              }`}
                              type="button"
                              disabled={disabled}
                              aria-pressed={selected}
                              onClick={() => {
                                storefront.setSelectedVariant(variant);
                                storefront.setQuickError("");
                              }}
                              variant="ghost"
                            >
                              {variant}
                            </Button>
                          );
                        })}
                      </div>
                      <p id="quickError" className="mt-[7px] min-h-[19px] text-[0.75rem] text-[var(--error)]">
                        {storefront.quickError}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-[23px]">
                      <div className="mb-2.5 flex justify-between gap-5 text-[0.78rem]">
                        <strong>Fit details</strong>
                        <Button
                          className="h-auto p-0 text-[var(--muted)]"
                          type="button"
                          onClick={() => storefront.open("measureModal")}
                          variant="link"
                        >
                          View measurements
                        </Button>
                      </div>
                    </div>
                  )}
                  {active.flaw !== "None" ? (
                    <Button
                      className="mt-[18px] h-auto w-full justify-start rounded-none border-l-[3px] border-l-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-[13px] text-left text-[0.78rem]"
                      type="button"
                      onClick={() => storefront.openViewer(4)}
                      variant="ghost"
                    >
                      <span>
                        <strong>Disclosed detail:</strong> {active.flaw}. <u>View detail image</u>
                      </span>
                    </Button>
                  ) : null}
                  <div className="mt-6 grid grid-cols-[1fr_auto] gap-2 max-[600px]:grid-cols-[1fr_48px]">
                    <Button
                      className="button button-primary w-full"
                      type="button"
                      disabled={active.status !== "available"}
                      onClick={() => storefront.addFromQuick(active.id)}
                    >
                      {active.status === "available" ? "Add to bag" : active.status}
                    </Button>
                    <Button
                      className={`size-12 rounded-[4px] border border-[var(--line-strong)] bg-transparent p-0 ${
                        storefront.saved.has(active.id) ? "text-[var(--oxblood)]" : ""
                      }`}
                      type="button"
                      aria-label={`${storefront.saved.has(active.id) ? "Remove" : "Save"} ${active.name}`}
                      onClick={() => storefront.toggleSaved(active.id)}
                      size="icon-lg"
                      variant="ghost"
                    >
                      <IconHeart filled={storefront.saved.has(active.id)} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div
        id="imageViewer"
        className={`overlay modal-wrap${storefront.openId === "imageViewer" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Product images"
        onClick={overlayBackdrop}
      >
        <section className="modal image-modal">
          <div className="modal-head">
            <h2>Product images</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close image viewer"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div className="mt-4 grid h-[calc(100%-72px)] grid-cols-[92px_1fr] gap-[14px] max-[600px]:grid-cols-1 max-[600px]:grid-rows-[1fr_auto]">
            <div
              id="viewerThumbs"
              className="grid content-start gap-2 overflow-auto max-[600px]:order-2 max-[600px]:auto-cols-[72px] max-[600px]:grid-flow-col max-[600px]:overflow-x-auto"
            >
              {viewerProduct.images.map((src, index) => (
                <Button
                  key={`${src}-${index}`}
                  className={`aspect-[4/5] h-auto overflow-hidden rounded-[4px] border bg-[var(--linen)] p-0 ${
                    index === storefront.imageIndex
                      ? "border-[var(--ink)]"
                      : "border-transparent"
                  }`}
                  type="button"
                  aria-label={viewerLabels[index]}
                  aria-pressed={index === storefront.imageIndex}
                  onClick={() => {
                    storefront.setImageIndex(index);
                    storefront.setZoom(1);
                  }}
                  variant="ghost"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </Button>
              ))}
            </div>
            <div
              id="viewerMain"
              className="relative grid min-h-0 place-items-center overflow-hidden rounded-[5px] bg-[var(--bone-2)]"
              style={{ "--zoom": storefront.zoom } as CSSProperties}
            >
              <img
                id="viewerImage"
                src={viewerProduct.images[storefront.imageIndex]}
                alt={`${viewerProduct.name}, ${viewerLabels[storefront.imageIndex]?.toLowerCase()}`}
                className="h-auto max-h-full w-auto max-w-full object-contain [transform:scale(var(--zoom,1))] [transition:transform_220ms_var(--ease)]"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                <div className="flex gap-[7px]">
                  <Button
                    className={viewerControlClass}
                    id="prevImage"
                    type="button"
                    aria-label="Previous image"
                    onClick={() => {
                      storefront.setImageIndex(
                        (index) =>
                          (index - 1 + viewerProduct.images.length) % viewerProduct.images.length,
                      );
                      storefront.setZoom(1);
                    }}
                    size="icon-lg"
                    variant="ghost"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </Button>
                  <Button
                    className={viewerControlClass}
                    id="nextImage"
                    type="button"
                    aria-label="Next image"
                    onClick={() => {
                      storefront.setImageIndex(
                        (index) => (index + 1) % viewerProduct.images.length,
                      );
                      storefront.setZoom(1);
                    }}
                    size="icon-lg"
                    variant="ghost"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>
                <span
                  id="viewerCount"
                  className="rounded-full bg-[rgba(243,240,232,0.9)] px-[13px] py-2.5 font-mono text-[0.7rem] font-medium leading-none"
                >
                  {storefront.imageIndex + 1} / {viewerProduct.images.length}
                </span>
                <div className="flex gap-[7px]">
                  <Button
                    className={viewerControlClass}
                    id="zoomOut"
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => storefront.setZoom((zoom) => Math.max(1, zoom - 0.25))}
                    size="icon-lg"
                    variant="ghost"
                  >
                    −
                  </Button>
                  <Button
                    className={viewerControlClass}
                    id="zoomIn"
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => storefront.setZoom((zoom) => Math.min(2.2, zoom + 0.25))}
                    size="icon-lg"
                    variant="ghost"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div
        id="savedDrawer"
        className={`overlay${storefront.openId === "savedDrawer" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Saved items"
        onClick={overlayBackdrop}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <h2>Saved items</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close saved items"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div id="savedList" className="mt-5 grid gap-3">
            {storefront.savedList.length ? (
              storefront.savedList.map((product) => (
                <article
                  key={product.id}
                  className="grid grid-cols-[94px_1fr] gap-[13px] border-b border-[var(--line)] pb-[14px]"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-[118px] w-[94px] rounded-[4px] object-cover"
                  />
                  <div>
                    <div className="flex justify-between gap-3">
                      <h3 className="m-0 text-[0.9rem] leading-[1.25]">{product.name}</h3>
                      <Button
                        className="size-7 rounded-full p-0"
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => storefront.toggleSaved(product.id)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        ×
                      </Button>
                    </div>
                    <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                      Size {product.size} · Grade {product.condition} · {product.status}
                    </p>
                    <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">{money(product.price)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Button
                        className="h-auto p-0 text-[0.72rem]"
                        type="button"
                        onClick={() => storefront.openQuick(product.id)}
                        variant="link"
                      >
                        View details
                      </Button>
                      {product.status === "available" ? (
                        <Button
                          className="button min-h-[38px] px-3"
                          type="button"
                          onClick={() =>
                            product.inventory === "variant"
                              ? storefront.openQuick(product.id)
                              : storefront.addToCart(product.id)
                          }
                          variant="outline"
                        >
                          {product.inventory === "variant" ? "Choose size" : "Add to bag"}
                        </Button>
                      ) : (
                        <Button
                          className="h-auto p-0 text-[0.72rem]"
                          type="button"
                          onClick={() => storefront.applyShop({ collection: "one-of-one" })}
                          variant="link"
                        >
                          Find similar
                        </Button>
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
                <Button className="button button-primary" type="button" onClick={storefront.closeAll}>
                  Browse products
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>

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
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close shopping bag"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div id="cartList" className="mt-5 grid gap-3">
            {storefront.cartLines.length ? (
              storefront.cartLines.map(({ product, lineQty, variant }) => (
                <article
                  key={product.id}
                  className="grid grid-cols-[94px_1fr] gap-[13px] border-b border-[var(--line)] pb-[14px]"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-[118px] w-[94px] rounded-[4px] object-cover"
                  />
                  <div>
                    <div className="flex justify-between gap-3">
                      <h3 className="m-0 text-[0.9rem] leading-[1.25]">{product.name}</h3>
                      <Button
                        className="size-7 rounded-full p-0"
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => storefront.removeFromCart(product.id)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        ×
                      </Button>
                    </div>
                    <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                      {variant ? `Size ${variant} · ` : ""}
                      {inventoryLabel(product.inventory)} · Grade {product.condition}
                    </p>
                    <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">{money(product.price)}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {product.inventory === "one-of-one" ? (
                        <span className="inventory-note">Quantity 1</span>
                      ) : (
                        <div className="inline-grid grid-cols-[34px_38px_34px] overflow-hidden rounded-[4px] border border-[var(--line)]">
                          <Button
                            className="h-[34px] rounded-none border-0 bg-transparent p-0"
                            type="button"
                            aria-label={`Decrease ${product.name} quantity`}
                            onClick={() => storefront.changeQty(product.id, -1)}
                            variant="ghost"
                          >
                            −
                          </Button>
                          <span className="grid place-items-center border-x border-[var(--line)] text-[0.78rem]">
                            {lineQty}
                          </span>
                          <Button
                            className="h-[34px] rounded-none border-0 bg-transparent p-0"
                            type="button"
                            aria-label={`Increase ${product.name} quantity`}
                            onClick={() => storefront.changeQty(product.id, 1)}
                            variant="ghost"
                          >
                            +
                          </Button>
                        </div>
                      )}
                      <Button
                        className="h-auto p-0 text-[0.72rem]"
                        type="button"
                        onClick={() => storefront.toggleSaved(product.id)}
                        variant="link"
                      >
                        Move to saved
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="px-2.5 py-[66px] text-center">
                <div className="mx-auto mb-5 grid size-[78px] place-items-center rounded-full border border-[var(--line)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7 [stroke-width:1.25]" aria-hidden="true">
                    <path d="M6 7h12l1 13H5L6 7Z" />
                    <path d="M9 9V6a3 3 0 0 1 6 0v3" />
                  </svg>
                </div>
                <h3 className="m-0 text-[1.5rem]">Your bag is empty</h3>
                <p className="mx-auto mb-[22px] mt-2.5 max-w-[20rem] text-[var(--muted)]">
                  Start with the latest drop or choose a one-of-one piece.
                </p>
                <Button className="button button-primary" type="button" onClick={storefront.closeAll}>
                  Continue shopping
                </Button>
              </div>
            )}
          </div>
          <div
            id="cartSummary"
            className="sticky bottom-[-24px] -mx-6 -mb-6 mt-7 border-t border-[var(--line)] bg-[var(--bone)] px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 max-[600px]:-mx-[18px] max-[600px]:-mb-[18px] max-[600px]:px-[18px]"
          >
            <div className="flex justify-between gap-5">
              <span>Subtotal</span>
              <strong id="subtotal" className="price">{money(storefront.subtotal)}</strong>
            </div>
            <p className="mb-4 mt-2 text-[0.75rem] text-[var(--muted)]">
              Delivery is calculated from your state and location.
            </p>
            <Button
              id="checkoutButton"
              className="button button-primary w-full"
              type="button"
              disabled={!storefront.cartLines.length}
              onClick={() =>
                storefront.showToast("Checkout is represented as the next flow in this prototype.")
              }
            >
              Continue to checkout
            </Button>
          </div>
        </aside>
      </div>

      <div
        id="filterDrawer"
        className={`overlay${storefront.openId === "filterDrawer" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        onClick={overlayBackdrop}
      >
        <aside className="drawer">
          <div className="drawer-head">
            <h2>Filter products</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close filters"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div id="filterContent"><FilterControls /></div>
          <div className="filter-footer">
            <Button className="button" type="button" onClick={storefront.clearFilters} variant="outline">
              Clear all
            </Button>
            <Button className="button button-primary" type="button" onClick={storefront.closeAll}>
              Show products
            </Button>
          </div>
        </aside>
      </div>

      <div
        id="sortSheet"
        className={`overlay modal-wrap${storefront.openId === "sortSheet" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Sort products"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Sort products</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close sort options"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div id="sortOptions" className="mt-[18px] grid gap-2.5">
            {sortOptions.map(([value, label]) => {
              const selected = storefront.sort === value;
              return (
                <Button
                  key={value}
                  className={`guide-card h-auto w-full justify-between text-left ${
                    selected ? "bg-[var(--ink)] text-[var(--bone)] hover:bg-[var(--ink)]" : ""
                  }`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    storefront.setSort(value);
                    storefront.closeAll();
                  }}
                  variant="ghost"
                >
                  <strong>{label}</strong>
                  {selected ? <span>✓</span> : null}
                </Button>
              );
            })}
          </div>
        </section>
      </div>

      <div
        id="conditionModal"
        className={`overlay modal-wrap${storefront.openId === "conditionModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Condition guide"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Condition guide</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close condition guide"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            <article className="guide-card">
              <div className="flex justify-between gap-4"><h3>Grade A+ — Like new</h3><span className="badge badge-sage">A+</span></div>
              <p>Minimal or no visible wear. No stains, structural damage, stretched areas or damaged fastenings.</p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4"><h3>Grade A — Excellent</h3><span className="badge">A</span></div>
              <p>Very light signs of normal use while remaining highly presentable and ready to wear.</p>
            </article>
            <article className="guide-card">
              <div className="flex justify-between gap-4"><h3>Grade B+ — Good</h3><span className="badge">B+</span></div>
              <p>A wearable piece with a minor flaw photographed and described before purchase.</p>
            </article>
          </div>
        </section>
      </div>

      <div
        id="measureModal"
        className={`overlay modal-wrap${storefront.openId === "measureModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Measurements and fit"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Measurements and fit</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close measurements"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <p className="text-[0.84rem] text-[var(--muted)]">
            Pre-owned garments may fit differently from their tagged size. Compare these measurements with a similar piece you already own.
          </p>
          <div className="measure-grid">
            <div className="measure-illustration"><div className="garment-shape" /></div>
            <div>
              <div className="unit-switch">
                <Button
                  className={storefront.measureUnit === "cm" ? "active" : ""}
                  type="button"
                  aria-pressed={storefront.measureUnit === "cm"}
                  onClick={() => storefront.setMeasureUnit("cm")}
                  variant="ghost"
                >
                  Centimetres
                </Button>
                <Button
                  className={storefront.measureUnit === "in" ? "active" : ""}
                  type="button"
                  aria-pressed={storefront.measureUnit === "in"}
                  onClick={() => storefront.setMeasureUnit("in")}
                  variant="ghost"
                >
                  Inches
                </Button>
              </div>
              <dl id="measureList" className="measure-table">
                {Object.entries(measurementsCm).map(([key, value]) => (
                  <div key={key} className="measure-row">
                    <dt>{key}</dt>
                    <dd className="mono">
                      {storefront.measureUnit === "cm"
                        ? `${value} cm`
                        : `${(value / 2.54).toFixed(1)} in`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </div>

      <div
        id="deliveryModal"
        className={`overlay modal-wrap${storefront.openId === "deliveryModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Delivery estimate"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Delivery estimate</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close delivery estimate"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <form id="deliveryForm" className="mt-5" onSubmit={onDeliverySubmit}>
            <div className="field">
              <label htmlFor="deliveryArea">State or delivery area</label>
              <input id="deliveryArea" name="area" required placeholder="e.g. Lagos" />
            </div>
            <Button className="button button-primary mt-3" type="submit">
              Check estimate
            </Button>
            <p id="deliveryStatus" className="text-[0.8rem]" aria-live="polite">
              {storefront.deliveryStatus}
            </p>
          </form>
        </section>
      </div>

      <div
        id="authModal"
        className={`overlay modal-wrap${storefront.openId === "authModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Brand labelling"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Brand labelling</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close brand labelling"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            <article className="guide-card"><h3>Branded</h3><p>A recognised label is visible on the garment. This is not automatically an independent authenticity claim.</p></article>
            <article className="guide-card"><h3>Unverified</h3><p>Branding is visible, but authenticity has not been independently confirmed.</p></article>
            <article className="guide-card"><h3>Designer-inspired</h3><p>The piece references a design language without claiming a specific origin.</p></article>
            <article className="guide-card"><h3>Unbranded</h3><p>Selected for fabric, fit, condition and everyday usefulness.</p></article>
          </div>
        </section>
      </div>

      <div
        id="supportModal"
        className={`overlay modal-wrap${storefront.openId === "supportModal" ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ask about a product"
        onClick={overlayBackdrop}
      >
        <section className="modal modal-small">
          <div className="modal-head">
            <h2>Ask about a product</h2>
            <Button
              className={closeButtonClass}
              type="button"
              aria-label="Close support form"
              onClick={storefront.closeAll}
              size="icon-lg"
              variant="ghost"
            >
              <IconClose />
            </Button>
          </div>
          <form id="supportForm" className="mt-5 grid gap-[14px]" onSubmit={onSupportSubmit}>
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
              <textarea id="supportMessage" required rows={5} className="p-3" />
            </div>
            <Button className="button button-primary" type="submit">
              Send question
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}

export function FilterControls() {
  const storefront = useStorefront();
  const countByCategory = (value: string) =>
    products.filter((product) => product.category === value || product.type === value).length;
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
                checked={storefront.category === "All"}
                onChange={() => {
                  storefront.setCategory("All");
                  storefront.setCollection(null);
                }}
              />{" "}
              All products
            </span>
            <span className="check-count">{products.length}</span>
          </label>
          {filterCategories.map((value) => (
            <label key={value} className="check">
              <span>
                <input
                  type="radio"
                  name="categoryFilter"
                  value={value}
                  checked={storefront.category === value}
                  onChange={() => {
                    storefront.setCategory(value);
                    storefront.setCollection(null);
                  }}
                />{" "}
                {value}
              </span>
              <span className="check-count">{countByCategory(value)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Condition</h3>
        <div className="filter-options">
          {["A+", "A", "B+"].map((value) => (
            <label key={value} className="check">
              <span>
                <input
                  type="checkbox"
                  value={value}
                  checked={storefront.conditions.has(value)}
                  onChange={(event) =>
                    storefront.setConditions((previous) => {
                      const next = new Set(previous);
                      if (event.target.checked) next.add(value);
                      else next.delete(value);
                      return next;
                    })
                  }
                />{" "}
                Grade {value}
              </span>
              <span className="check-count">
                {products.filter((product) => product.condition === value).length}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Inventory</h3>
        <div className="filter-options">
          {inventoryRows.map(([value, label]) => (
            <label key={value} className="check">
              <span>
                <input
                  type="checkbox"
                  value={value}
                  checked={storefront.inventories.has(value)}
                  onChange={(event) =>
                    storefront.setInventories((previous) => {
                      const next = new Set(previous);
                      if (event.target.checked) next.add(value);
                      else next.delete(value);
                      return next;
                    })
                  }
                />{" "}
                {label}
              </span>
              <span className="check-count">
                {products.filter((product) => product.inventory === (value as Product["inventory"])).length}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Price</h3>
        <div className="price-range">
          <Button className="control-button" type="button" onClick={() => storefront.setMaxPrice(25000)} variant="outline">
            Under ₦25k
          </Button>
          <Button className="control-button" type="button" onClick={() => storefront.setMaxPrice(40000)} variant="outline">
            Under ₦40k
          </Button>
        </div>
      </section>

      <section className="filter-section">
        <label className="check">
          <span>
            <input
              type="checkbox"
              checked={storefront.inStock}
              onChange={(event) => storefront.setInStock(event.target.checked)}
            />{" "}
            In stock only
          </span>
          <span className="check-count">
            {products.filter((product) => product.status === "available").length}
          </span>
        </label>
      </section>
    </>
  );
}
