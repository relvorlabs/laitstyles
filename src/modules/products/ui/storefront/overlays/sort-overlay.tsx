"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ParsedCatalogueSearch } from "@/modules/products/client/catalogue-search-params";
import { useCatalogueNavigation } from "@/modules/products/client/use-catalogue-navigation";
import { sortOptions } from "@/modules/products/ui/storefront/catalogue-data";
import { useStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose } from "@/modules/storefront-shell/ui/storefront-icons";

export function SortOverlay() {
  const overlay = useStorefrontOverlay();
  const navigation = useCatalogueNavigation();
  const open = overlay.openId === "sortSheet";

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) overlay.open("sortSheet");
        else if (overlay.openId === "sortSheet") overlay.close();
      }}
      open={open}
    >
      <DialogContent
        className="lst-storefront grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[760px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] shadow-2xl sm:max-h-[min(720px,calc(100dvh-3rem))] sm:w-[calc(100vw-3rem)] sm:max-w-[760px]"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-[var(--line)] px-4 py-4 text-left sm:px-6 sm:py-5">
          <div className="min-w-0">
            <DialogTitle className="font-serif text-2xl leading-tight font-normal sm:text-3xl">
              Sort products
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-xl text-xs leading-5 text-[var(--muted)] sm:text-sm">
              Choose how products should be ordered in the catalogue.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                aria-label="Close sort options"
                className="shrink-0"
                size="icon-lg"
                type="button"
                variant="ghost"
              />
            }
          >
            <IconClose />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6" id="sortOptions">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sortOptions.map(([value, label]) => {
              const selected = navigation.search.sort === value;
              return (
                <Button
                  aria-pressed={selected}
                  className="min-h-12 min-w-0 justify-between gap-4 whitespace-normal px-4 py-3 text-left"
                  key={value}
                  onClick={() => {
                    navigation.setSort(value as ParsedCatalogueSearch["sort"]);
                    overlay.close();
                  }}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                >
                  <strong className="min-w-0 flex-1 leading-5">{label}</strong>
                  {selected ? <span className="shrink-0" aria-hidden="true">✓</span> : null}
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
