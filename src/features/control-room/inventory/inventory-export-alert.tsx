"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

export function InventoryExportAlert({
  count,
  onDismiss,
}: {
  count: number | null;
  onDismiss: () => void;
}) {
  if (!count) return null;

  return (
    <Alert aria-live="polite" className="border-success/35 bg-success/10 text-foreground">
      <ControlRoomIcon className="text-success" icon={CheckmarkCircle02Icon} size={18} />
      <AlertTitle>Inventory export created</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {count} selected product{count === 1 ? "" : "s"} were exported as a CSV file.
      </AlertDescription>
      <AlertAction>
        <Button
          className="h-8 rounded-full px-3"
          onClick={onDismiss}
          size="sm"
          type="button"
          variant="ghost"
        >
          Dismiss
        </Button>
      </AlertAction>
    </Alert>
  );
}
