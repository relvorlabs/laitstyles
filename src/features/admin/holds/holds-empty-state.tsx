import { TimeQuarter02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

export function HoldsEmptyState({ hasHolds, onReset }: { hasHolds: boolean; onReset: () => void }) {
  return (
    <Card className="items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <AdminIcon icon={TimeQuarter02Icon} size={23} />
      </span>
      <h2 className="mt-5 font-serif text-[28px] font-medium">
        {hasHolds ? "No holds match this view" : "No holds yet"}
      </h2>
      <p className="mt-3 max-w-[480px] text-[12.5px] leading-5 text-muted-foreground">
        {hasHolds
          ? "Reset the current search and filters to return to the full reservation record."
          : "Storefront and staff-assisted reservations will appear here when stock is held."}
      </p>
      {hasHolds ? (
        <Button
          className="mt-6 h-11 rounded-full px-5"
          onClick={onReset}
          type="button"
          variant="outline"
        >
          Reset filters
        </Button>
      ) : null}
    </Card>
  );
}
