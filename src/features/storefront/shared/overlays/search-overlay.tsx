"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { money } from "../catalogue-data";
import { IconClose, IconSearch } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

const searchSuggestions: [string, string][] = [
  ["Levi's", "Levi’s denim"],
  ["Grade A+", "Grade A+"],
  ["Jacket", "Jackets"],
  ["Vintage", "Vintage"],
];
export function SearchOverlay() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };

  return (
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
                className="grid h-auto w-full grid-cols-[74px_1fr_auto] items-center justify-stretch gap-[14px] text-left max-[600px]:grid-cols-[64px_1fr]"
                type="button"
                onClick={() => storefront.openQuick(product.id)}
                variant="ghost"
              >
                <Image
                  src={product.images[0]}
                  alt=""
                  width={148}
                  height={184}
                  sizes="(max-width: 600px) 64px, 74px"
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
  );
}
