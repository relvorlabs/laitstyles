"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

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
    <div className="sticky bottom-4 z-20 mx-auto flex w-[min(100%,720px)] flex-col gap-3 rounded-[18px] border border-white/10 bg-primary px-4 py-3 text-primary-foreground shadow-[0_22px_60px_rgba(27,26,23,.24)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[12px] font-semibold">
          {selectedCount} product{selectedCount === 1 ? "" : "s"} selected
        </div>
        <div className="mt-0.5 text-[10.5px] text-white/[0.64]">
          Only non-destructive local actions are available in this phase.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount === 1 ? (
          <Button
            className="h-10 rounded-full border-white/[0.18] px-4 text-white hover:bg-white/[0.08] hover:text-white"
            onClick={onOpenSelected}
            type="button"
            variant="outline"
          >
            Open selected
            <ControlRoomIcon icon={ArrowRight01Icon} size={15} />
          </Button>
        ) : null}
        <Button
          className="h-10 rounded-full bg-[#D9E1C9] px-4 text-primary hover:bg-[#C9D5B3]"
          onClick={onExport}
          type="button"
        >
          Export selection
        </Button>
        <Button
          className="h-10 rounded-full px-3 text-white/[0.72] hover:bg-white/[0.08] hover:text-white"
          onClick={onClear}
          type="button"
          variant="ghost"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
