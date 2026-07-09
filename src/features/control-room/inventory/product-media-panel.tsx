import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { InventoryListItem } from "@/lib/control-room/types";

export function ProductMediaPanel({ item }: { item: InventoryListItem }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {item.product.media.map((media) => (
        <figure
          className="overflow-hidden rounded-[16px] border border-border bg-card"
          key={media.id}
        >
          <div className="relative aspect-[4/5] bg-secondary">
            <Image
              alt={media.alt}
              className="object-cover"
              fill
              sizes="(min-width: 640px) 340px, 100vw"
              src={media.url}
            />
          </div>
          <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] text-muted-foreground">
            <span>{media.alt}</span>
            <Badge variant="outline">{media.kind}</Badge>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
