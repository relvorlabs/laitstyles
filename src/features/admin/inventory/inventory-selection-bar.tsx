"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

type InventorySelectionBarProps = {
  selectedCount: number;
  onClear: () => void;
  onExport: () => void;
  onOpenSelected: () => void;
};

export function InventorySelectionBar({
  selectedCount,
  onClear,
  onExport,
  onOpenSelected,
}: InventorySelectionBarProps) {
  if (!selectedCount) return null;

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-[min(100%,720px)] flex-col gap-3 rounded-[18px] border border-primary-foreground/10 bg-primary px-4 py-3 text-primary-foreground shadow-laitstyle sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[12px] font-semibold">
          {selectedCount} product{selectedCount === 1 ? "" : "s"} selected
        </div>
        <div className="mt-0.5 text-[10.5px] text-primary-foreground/64">
          Only non-destructive local actions are available in this phase.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount === 1 ? (
          <Button size="lg" onClick={onOpenSelected} type="button" variant="outline">
            Open selected
            <AdminIcon icon={ArrowRight01Icon} size={15} />
          </Button>
        ) : null}
        <Button size="lg" onClick={onExport} type="button">
          Export selection
        </Button>
        <Button size="lg" onClick={onClear} type="button" variant="ghost">
          Clear
        </Button>
      </div>
    </div>
  );
}
