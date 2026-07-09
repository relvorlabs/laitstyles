"use client";

import Link from "next/link";
import { Alert02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

export default function InventoryError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[900px] items-center px-4 py-10 sm:px-6 lg:px-8">
      <Empty className="min-h-[460px] border border-border bg-card shadow-[0_24px_70px_rgba(27,26,23,.08)]">
        <EmptyHeader>
          <EmptyMedia className="grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ControlRoomIcon icon={Alert02Icon} size={27} />
          </EmptyMedia>
          <EmptyTitle className="font-serif text-[32px] font-medium">
            Inventory could not be assembled.
          </EmptyTitle>
          <EmptyDescription className="max-w-[500px]">
            Product records have not been changed. Retry the workspace or return to the daily Overview.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-2 flex-row flex-wrap justify-center">
          <Button
            className="h-11 rounded-full px-5"
            onClick={reset}
            size="lg"
            type="button"
          >
            Retry Inventory
          </Button>
          <Link
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-11 rounded-full px-5",
            })}
            href="/admin"
          >
            Return to Overview
            <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  );
}
