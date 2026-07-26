"use client";

import Image from "next/image";
import { type KeyboardEvent, type MouseEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCatalogueNavigation } from "@/features/storefront/catalogue/use-catalogue-navigation";
import { openQuickView } from "@/features/storefront/shared/storefront-overlay-events";
import { useStorefrontCatalogueData, useStorefrontOverlay } from "../storefront-runtime";
import { money } from "../catalogue-data";
import { IconClose, IconSearch } from "../storefront-icons";

const searchSuggestions: [string, string][] = [
  ["Levi's", "Levi’s denim"],
  ["Grade A+", "Grade A+"],
  ["Jacket", "Jackets"],
  ["Vintage", "Vintage"],
];

export function SearchOverlay() {
  const navigation = useCatalogueNavigation();
  const overlay = useStorefrontOverlay();
  const { products } = useStorefrontCatalogueData();
  const [value, setValue] = useState("");
  const results = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return null;
    return products
      .filter((product) =>
        [
          product.name,
          product.brand,
          product.category,
          product.type,
          product.style,
          `Grade ${product.condition}`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 7);
  }, [products, value]);

  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };
  const navigateSearch = () => {
    if (!navigation.searchFor(value)) return;
    overlay.close();
  };
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") navigateSearch();
  };

  return (
    <div
      aria-label="Search the rack"
      aria-modal="true"
      className={`overlay modal-wrap${overlay.openId === "searchModal" ? " open" : ""}`}
      id="searchModal"
      onClick={overlayBackdrop}
      role="dialog"
    >
      <section className="modal search-modal">
        <div className="modal-head">
          <h2>Search the rack</h2>
          <Button
            aria-label="Close search"
            onClick={overlay.close}
            size="icon-lg"
            type="button"
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
            autoComplete="off"
            className="min-h-[66px] w-full border-0 border-b border-[var(--line-strong)] bg-transparent pr-[52px] text-[1.35rem]"
            id="searchInput"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Try “Levi’s denim”"
            value={value}
          />
          <IconSearch className="absolute right-[14px] top-[22px] h-5 w-5 text-[var(--muted)]" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {searchSuggestions.map(([term, label]) => (
            <Button
              key={term}
              onClick={() => setValue(term)}
              type="button"
              variant="outline"
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="mt-6 grid gap-2.5" id="searchResults">
          {results === null ? (
            <div className="search-empty">
              Start typing to search products, brands, categories or condition grades.
            </div>
          ) : results.length ? (
            results.map((product) => (
              <Button
                className="grid h-auto w-full grid-cols-[74px_1fr_auto] items-center justify-stretch gap-[14px] text-left max-[600px]:grid-cols-[64px_1fr]"
                key={product.id}
                onClick={() => openQuickView(product.id)}
                type="button"
                variant="ghost"
              >
                <Image
                  alt=""
                  className="h-[92px] w-[74px] rounded-[4px] object-cover max-[600px]:h-20 max-[600px]:w-16"
                  height={184}
                  sizes="(max-width: 600px) 64px, 74px"
                  src={product.images[0]}
                  width={148}
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
  );
}
