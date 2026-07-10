"use client";

import { useWatch, useFormContext } from "react-hook-form";
import {
  Archive02Icon,
  Layers01Icon,
  PackageAddIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type {
  InventoryMode,
  ProductEditorValues,
} from "@/lib/control-room/types";
import { cn } from "@/lib/utils";

const productTypes = [
  {
    value: "unique" as const,
    label: "Unique piece",
    eyebrow: "One physical item",
    description:
      "For one-of-one thrift finds, archive pieces and individually graded garments.",
    example: "Nature Utility Vest",
    icon: Archive02Icon,
  },
  {
    value: "stocked" as const,
    label: "Stocked product",
    eyebrow: "Multiple matching units",
    description:
      "For one product sold from a shared quantity without size or colour variants.",
    example: "Botanical Jeans · 50 units",
    icon: PackageAddIcon,
  },
  {
    value: "variant" as const,
    label: "Product with variants",
    eyebrow: "Sizes, colours or options",
    description:
      "For one product whose stock must be tracked separately by size, colour or another option.",
    example: "Ribbed Studio Tank",
    icon: Layers01Icon,
  },
];

export function ProductTypeStep({
  onModeChange,
}: {
  onModeChange: (mode: InventoryMode) => void;
}) {
  const { control } = useFormContext<ProductEditorValues>();
  const mode = useWatch({ control, name: "inventoryMode" });

  return (
    <section aria-labelledby="product-type-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Catalogue structure
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-type-title"
        >
          How should stock behave for this product?
        </h2>
        <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-muted-foreground">
          This choice controls the Stock step. Changing it later keeps common product details but removes stock fields that no longer apply.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {productTypes.map((type) => {
          const selected = mode === type.value;

          return (
            <button
              aria-pressed={selected}
              className={cn(
                "group flex min-h-[220px] flex-col rounded-[18px] border bg-card p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary shadow-laitstyle"
                  : "border-border hover:border-foreground/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
              )}
              key={type.value}
              onClick={() => onModeChange(type.value)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  <ControlRoomIcon icon={type.icon} size={20} />
                </span>
                {selected ? <Badge>Selected</Badge> : null}
              </div>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {type.eyebrow}
              </p>
              <h3 className="mt-1 font-serif text-[24px] font-medium">
                {type.label}
              </h3>
              <p className="mt-3 text-[12.5px] leading-5 text-muted-foreground">
                {type.description}
              </p>
              <p className="mt-auto pt-5 text-[11px] font-semibold text-foreground">
                Example: {type.example}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
