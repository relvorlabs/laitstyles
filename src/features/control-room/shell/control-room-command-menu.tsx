"use client";

import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight01Icon,
  ChartIncreaseIcon,
  DashboardSquare01Icon,
  PackageIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

type ControlRoomCommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const overviewTargets = [
  {
    label: "Today’s store pulse",
    detail: "Revenue, orders, units and holds",
    target: "#today",
    icon: DashboardSquare01Icon,
  },
  {
    label: "Attention queue",
    detail: "Payments, packing, delivery and stock",
    target: "#attention",
    icon: Search01Icon,
  },
  {
    label: "Sales pulse",
    detail: "Seven-day online and offline revenue",
    target: "#sales-pulse",
    icon: ChartIncreaseIcon,
  },
  {
    label: "Inventory watch",
    detail: "Low stock and unpublished products",
    target: "#inventory-watch",
    icon: PackageIcon,
  },
] as const;

export function ControlRoomCommandMenu({
  open,
  onOpenChange,
}: ControlRoomCommandMenuProps) {
  const router = useRouter();
  const toggleOpen = useEffectEvent(() => onOpenChange(!open));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleOpen();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function choose(target: string) {
    onOpenChange(false);

    if (target.startsWith("#")) {
      window.requestAnimationFrame(() => {
        document.querySelector(target)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    router.push(target);
  }

  return (
    <CommandDialog
      description="Move to an Overview section or open the storefront."
      onOpenChange={onOpenChange}
      open={open}
      title="Search the Control Room"
    >
      <Command>
        <CommandInput placeholder="Search today’s workspace…" />
        <CommandList>
          <CommandEmpty>No matching Control Room section.</CommandEmpty>
          <CommandGroup heading="Overview">
            {overviewTargets.map((item) => (
              <CommandItem
                key={item.target}
                onSelect={() => choose(item.target)}
                value={`${item.label} ${item.detail}`}
              >
                <span className="grid size-8 place-items-center rounded-[9px] bg-secondary text-foreground">
                  <ControlRoomIcon icon={item.icon} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Storefront">
            <CommandItem onSelect={() => choose("/")} value="Preview storefront">
              <span className="grid size-8 place-items-center rounded-[9px] bg-secondary text-foreground">
                <ControlRoomIcon icon={ArrowUpRight01Icon} size={16} />
              </span>
              <span className="font-medium">Preview storefront</span>
              <CommandShortcut>↗</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
