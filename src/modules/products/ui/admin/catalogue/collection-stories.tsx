"use client";

import { ArrowDown, ArrowUp, Images, Pencil } from "lucide-react";
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

type Props = {
  items: ProductTaxonomyItem[];
  loading: boolean;
  onEdit: (item: ProductTaxonomyItem) => void;
  onMove: (item: ProductTaxonomyItem, offset: -1 | 1) => void;
};

export function CollectionStories({ items, loading, onEdit, onMove }: Props) {
  if (loading)
    return (
      <div aria-label="Loading collections" className="space-y-6" role="status">
        {["one", "two", "three"].map((key) => (
          <Skeleton className="h-72 rounded-3xl" key={`collection-skeleton-${key}`} />
        ))}
      </div>
    );
  if (!items.length)
    return (
      <Empty className="min-h-80 rounded-3xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Images />
          </EmptyMedia>
          <EmptyTitle>No collections found</EmptyTitle>
          <EmptyDescription>
            Build an editorial story from products already in the catalogue.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <section aria-label="Collections" className="space-y-6">
      {items.map((item, index) => (
        <article
          className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]"
          key={item.id}
        >
          <div className="grid min-h-64 grid-cols-2 grid-rows-2 gap-px bg-border">
            {item.previewImageUrls.length ? (
              item.previewImageUrls.slice(0, 3).map((url, imageIndex) => (
                <div className={imageIndex === 0 ? "relative row-span-2" : "relative"} key={url}>
                  <CloudImage
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(min-width:1024px) 28vw, 50vw"
                    src={url}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-2 row-span-2 grid place-items-center bg-surface-sunken text-center text-muted-foreground">
                <div>
                  <Images className="mx-auto size-10" />
                  <p className="mt-3 text-sm">Add products to build this cover canvas.</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Collection {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-4 font-serif text-4xl">{item.name}</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                {item.productCount} product{item.productCount === 1 ? "" : "s"} shape this story.
                Cover imagery is drawn from its newest product covers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => onEdit(item)} variant="outline">
                <Pencil />
                Edit story
              </Button>
              <Button
                aria-label={`Move ${item.name} earlier`}
                disabled={index === 0}
                onClick={() => onMove(item, -1)}
                size="icon"
                variant="ghost"
              >
                <ArrowUp />
              </Button>
              <Button
                aria-label={`Move ${item.name} later`}
                disabled={index === items.length - 1}
                onClick={() => onMove(item, 1)}
                size="icon"
                variant="ghost"
              >
                <ArrowDown />
              </Button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
