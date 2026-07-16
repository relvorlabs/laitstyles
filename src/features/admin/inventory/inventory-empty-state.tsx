import { PackageIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

export function InventoryEmptyState({
  hasProducts,
  onReset,
}: {
  hasProducts: boolean;
  onReset: () => void;
}) {
  return (
    <Empty className="min-h-[420px] border border-dashed border-border bg-card">
      <EmptyHeader>
        <EmptyMedia className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <AdminIcon icon={hasProducts ? Search01Icon : PackageIcon} size={24} />
        </EmptyMedia>
        <EmptyTitle className="font-serif text-[28px] font-medium">
          {hasProducts ? "No products match this view" : "Inventory is ready for its first product"}
        </EmptyTitle>
        <EmptyDescription className="max-w-[480px]">
          {hasProducts
            ? "Clear the current search or filters to return to the wider catalogue."
            : "No catalogue records exist yet. Product controls will appear here when the store has an item ready to prepare."}
        </EmptyDescription>
      </EmptyHeader>
      {hasProducts ? (
        <EmptyContent>
          <Button size="lg" onClick={onReset} type="button">
            Reset Inventory view
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
