"use client";

import { Archive02Icon, Layers01Icon, PackageAddIcon } from "@hugeicons/core-free-icons";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { InventoryMode, ProductEditorValues } from "@/lib/admin/shared/types";
import { cn } from "@/lib/utils";

const productTypes = [
  {
    value: "unique" as const,
    label: "Unique piece",
    eyebrow: "One physical item",
    description: "For one-of-one thrift finds, archive pieces and individually graded garments.",
    example: "Nature Utility Vest",
    icon: Archive02Icon,
  },
  {
    value: "stocked" as const,
    label: "Stocked product",
    eyebrow: "Multiple matching units",
    description: "For one product sold from a shared quantity without size or colour variants.",
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

export function ProductTypeStep({ onModeChange }: { onModeChange: (mode: InventoryMode) => void }) {
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
          This choice controls the Stock step. Changing it later keeps common product details but
          removes stock fields that no longer apply.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {productTypes.map((type) => {
          const selected = mode === type.value;

          return (
            <Button
              aria-pressed={selected}
              className="group h-auto w-full flex-col items-stretch justify-start whitespace-normal py-4 text-left"
              key={type.value}
              onClick={() => onModeChange(type.value)}
              type="button"
              variant={selected ? "secondary" : "outline"}
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  <AdminIcon icon={type.icon} size={20} />
                </span>
                {selected ? <Badge>Selected</Badge> : null}
              </span>
              <span className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {type.eyebrow}
              </span>
              <span className="mt-1 font-serif text-[24px] font-medium">{type.label}</span>
              <span className="mt-3 text-[12.5px] leading-5 text-muted-foreground">
                {type.description}
              </span>
              <span className="mt-auto pt-5 text-[11px] font-semibold text-foreground">
                Example: {type.example}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
