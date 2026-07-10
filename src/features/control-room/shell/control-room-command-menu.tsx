"use client";

import { useEffect, useEffectEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight01Icon,
  ChartIncreaseIcon,
  DashboardSquare01Icon,
  PackageIcon,
  Search01Icon,
  Store01Icon,
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
import { settingsSections } from "@/features/control-room/settings/settings-config";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import { formatNaira, formatRelativeTime } from "@/lib/control-room/formatters";

const overviewTargets = [
  {
    label: "Today’s store pulse",
    detail: "Revenue, orders, units and active holds",
    target: "/admin#today",
    icon: DashboardSquare01Icon,
  },
  {
    label: "Attention queue",
    detail: "Payments, packing, delivery and stock exceptions",
    target: "/admin#attention",
    icon: Search01Icon,
  },
  {
    label: "Sales pulse",
    detail: "Seven-day online and offline revenue",
    target: "/admin#sales-pulse",
    icon: ChartIncreaseIcon,
  },
] as const;

const inventoryTargets = [
  {
    label: "All inventory",
    detail: "Unique pieces, stocked products and variants",
    target: "/admin/inventory",
  },
  {
    label: "Low stock",
    detail: "Products at or below their stock threshold",
    target: "/admin/inventory?view=low-stock",
  },
  {
    label: "Intake queue",
    detail: "New pieces still being prepared",
    target: "/admin/inventory?view=intake",
  },
] as const;

const terminalOrderStatuses = new Set([
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

type ControlRoomCommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ControlRoomCommandMenu({
  open,
  onOpenChange,
}: ControlRoomCommandMenuProps) {
  const router = useRouter();
  const { state } = useControlRoom();
  const toggleOpen = useEffectEvent(() => onOpenChange(!open));

  const records = useMemo(() => {
    const products = state.products
      .toSorted(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      .slice(0, 7);
    const orders = state.orders
      .filter((order) => !terminalOrderStatuses.has(order.fulfilmentStatus))
      .toSorted(
        (left, right) =>
          new Date(right.placedAt).getTime() - new Date(left.placedAt).getTime(),
      )
      .slice(0, 6);
    const customers = state.customers.slice(0, 6);
    const holds = state.holds
      .filter((hold) => !hold.status || hold.status === "active")
      .toSorted(
        (left, right) =>
          new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
      )
      .slice(0, 5);

    return { products, orders, customers, holds };
  }, [state.customers, state.holds, state.orders, state.products]);

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
    router.push(target);
  }

  return (
    <CommandDialog
      description="Find products, orders, customers, holds, settings and operating destinations."
      onOpenChange={onOpenChange}
      open={open}
      title="Search the Control Room"
    >
      <Command className="bg-surface-raised text-surface-raised-foreground">
        <div className="border-b border-border px-1 pt-1">
          <CommandInput placeholder="Search products, orders, customers or tasks…" />
        </div>
        <CommandList className="max-h-[min(68vh,620px)] px-1 pb-2">
          <CommandEmpty>
            <div className="px-5 py-10 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-sunken text-muted-foreground">
                <ControlRoomIcon icon={Search01Icon} size={19} />
              </span>
              <p className="mt-3 font-medium">No matching store record.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Try a product name, order number, customer, hold or Settings section.
              </p>
            </div>
          </CommandEmpty>

          <CommandGroup heading="Operate today">
            {overviewTargets.map((item) => (
              <CommandRecord
                detail={item.detail}
                icon={item.icon}
                key={item.target}
                label={item.label}
                onSelect={() => choose(item.target)}
                value={`${item.label} ${item.detail}`}
              />
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Products and inventory">
            {records.products.map((product) => (
              <CommandRecord
                detail={`${product.category} · ${formatNaira(product.price)} · ${product.publication}`}
                icon={PackageIcon}
                key={product.id}
                label={product.name}
                onSelect={() => choose(`/admin/inventory?product=${product.id}`)}
                value={`${product.name} ${product.brand} ${product.category} ${product.slug}`}
              />
            ))}
            {inventoryTargets.map((item) => (
              <CommandRecord
                detail={item.detail}
                icon={PackageIcon}
                key={item.target}
                label={item.label}
                onSelect={() => choose(item.target)}
                value={`${item.label} ${item.detail}`}
              />
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Open orders">
            {records.orders.map((order) => (
              <CommandRecord
                detail={`${order.customerLabel ?? "Customer"} · ${formatNaira(order.total)} · ${formatRelativeTime(state.asOf, order.placedAt)}`}
                icon={Store01Icon}
                key={order.id}
                label={`${order.id} · ${order.fulfilmentStatus.replaceAll("-", " ")}`}
                onSelect={() => choose(`/admin/orders?order=${order.id}`)}
                value={`${order.id} ${order.customerLabel ?? ""} ${order.deliveryCity} ${order.fulfilmentStatus}`}
              />
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Customers and holds">
            {records.customers.map((customer) => (
              <CommandRecord
                detail={`${customer.city} · ${customer.email || customer.phone}`}
                icon={Store01Icon}
                key={customer.id}
                label={customer.name}
                onSelect={() => choose(`/admin/customers?customer=${customer.id}`)}
                value={`${customer.name} ${customer.email} ${customer.phone} ${customer.city}`}
              />
            ))}
            {records.holds.map((hold) => (
              <CommandRecord
                detail={`${hold.customerLabel} · ${hold.stage} · expires ${formatRelativeTime(hold.expiresAt, state.asOf)}`}
                icon={Store01Icon}
                key={hold.id}
                label={`Hold ${hold.id}`}
                onSelect={() => choose(`/admin/holds?hold=${hold.id}`)}
                value={`${hold.id} ${hold.customerLabel} ${hold.stage}`}
              />
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Store settings">
            {settingsSections.map((section) => (
              <CommandRecord
                detail={section.outcome}
                icon={Store01Icon}
                key={section.value}
                label={section.label}
                onSelect={() => choose(`/admin/settings?section=${section.value}`)}
                value={`${section.label} ${section.description} ${section.outcome}`}
              />
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Storefront">
            <CommandItem onSelect={() => choose("/")} value="Preview storefront">
              <span className="grid size-9 place-items-center rounded-[10px] bg-surface-interactive text-surface-interactive-foreground">
                <ControlRoomIcon icon={ArrowUpRight01Icon} size={17} />
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

function CommandRecord({
  detail,
  icon,
  label,
  onSelect,
  value,
}: {
  detail: string;
  icon: Parameters<typeof ControlRoomIcon>[0]["icon"];
  label: string;
  onSelect: () => void;
  value: string;
}) {
  return (
    <CommandItem
      className="min-h-14 gap-3 rounded-xl px-2.5 py-2"
      onSelect={onSelect}
      value={value}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-interactive text-surface-interactive-foreground">
        <ControlRoomIcon icon={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {detail}
        </span>
      </span>
    </CommandItem>
  );
}
