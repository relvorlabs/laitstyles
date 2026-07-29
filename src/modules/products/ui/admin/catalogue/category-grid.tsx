"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Edit02Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductTaxonomyItem } from "@/modules/products/types";
import { AdminIcon } from "@/modules/products/ui/admin/admin-icon";

type Props = {
  items: ProductTaxonomyItem[];
  loading: boolean;
  onEdit: (item: ProductTaxonomyItem) => void;
  onMove: (item: ProductTaxonomyItem, offset: -1 | 1) => void;
};

export function CategoryGrid({ items, loading, onEdit, onMove }: Props) {
  if (loading)
    return (
      <div
        aria-label="Loading categories"
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        role="status"
      >
        {["one", "two", "three", "four", "five", "six"].map((key) => (
          <Skeleton className="aspect-[4/3] rounded-3xl" key={`category-skeleton-${key}`} />
        ))}
      </div>
    );
  if (!items.length)
    return (
      <Empty className="min-h-80 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AdminIcon icon={Image01Icon} size={22} />
          </EmptyMedia>
          <EmptyTitle>No categories found</EmptyTitle>
          <EmptyDescription>
            Create an image-led category or clear the current search.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <section aria-label="Categories" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <article
          className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
          key={item.id}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
            {item.imageUrl ? (
              <CloudImage
                alt=""
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
                fill
                sizes="(min-width:1280px) 33vw, (min-width:640px) 50vw, 100vw"
                src={item.imageUrl}
              />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <AdminIcon icon={Image01Icon} size={40} />
              </div>
            )}
            <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold backdrop-blur">
              {item.productCount} product{item.productCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-3 p-5">
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-serif text-2xl">{item.name}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Storefront position {item.position + 1}
              </p>
            </div>
            <Button
              aria-label={`Move ${item.name} earlier`}
              disabled={index === 0}
              onClick={() => onMove(item, -1)}
              size="icon"
              variant="ghost"
            >
              <AdminIcon icon={ArrowUp01Icon} size={18} />
            </Button>
            <Button
              aria-label={`Move ${item.name} later`}
              disabled={index === items.length - 1}
              onClick={() => onMove(item, 1)}
              size="icon"
              variant="ghost"
            >
              <AdminIcon icon={ArrowDown01Icon} size={18} />
            </Button>
            <Button
              aria-label={`Edit ${item.name}`}
              onClick={() => onEdit(item)}
              size="icon"
              variant="outline"
            >
              <AdminIcon icon={Edit02Icon} size={18} />
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
