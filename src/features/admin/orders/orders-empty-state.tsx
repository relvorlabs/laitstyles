import { PackageIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

export function OrdersEmptyState({
  hasOrders,
  onReset,
}: {
  hasOrders: boolean;
  onReset: () => void;
}) {
  return (
    <Card className="items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <AdminIcon icon={PackageIcon} size={23} />
      </span>
      <h2 className="mt-5 font-serif text-[28px] font-medium">
        {hasOrders ? "No orders match this view" : "No orders yet"}
      </h2>
      <p className="mt-3 max-w-[480px] text-[12.5px] leading-5 text-muted-foreground">
        {hasOrders
          ? "Reset the current search and filters to return to the full order record."
          : "Connected online, assisted and offline orders will appear here when they exist in this session."}
      </p>
      {hasOrders ? (
        <Button size="lg" className="mt-6" onClick={onReset} type="button" variant="outline">
          Reset filters
        </Button>
      ) : null}
    </Card>
  );
}
