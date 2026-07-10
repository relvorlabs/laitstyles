"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductMediaViewer } from "@/features/control-room/inventory/product-media-viewer";
import type { InventoryListItem } from "@/lib/control-room/types";

export function ProductMediaPanel({ item }: { item: InventoryListItem }) {
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {item.product.media.map((media) => (
          <figure
            className="overflow-hidden rounded-[16px] border border-border bg-card"
            key={media.id}
          >
            <button
              aria-label={`View ${media.alt}`}
              className="group relative block aspect-[4/5] w-full overflow-hidden bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => setOpenMediaId(media.id)}
              type="button"
            >
              <Image
                alt={media.alt}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
                fill
                sizes="(min-width: 640px) 340px, 100vw"
                src={media.url}
              />
              <span className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background/90 px-3 text-xs font-medium text-foreground shadow-lg backdrop-blur">
                <Expand aria-hidden="true" className="size-4" />
                View image
              </span>
            </button>
            <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] text-muted-foreground">
              <span className="min-w-0 truncate">{media.alt}</span>
              <Badge variant="outline">{media.kind}</Badge>
            </figcaption>
          </figure>
        ))}
      </div>

      <ProductMediaViewer
        initialMediaId={openMediaId}
        media={item.product.media}
        onOpenChange={(open) => {
          if (!open) setOpenMediaId(null);
        }}
        open={Boolean(openMediaId)}
        productName={item.product.name}
      />
    </>
  );
}
