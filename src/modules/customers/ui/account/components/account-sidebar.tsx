"use client";

import { Button } from "@/components/ui/button";
import { useAccountUi } from "../account-context";
import { type AccountNavItem, type AccountRoute, accountNavItems } from "../account-nav";

export function SidebarLink({
  item,
  active,
  onSelect,
  showMeta = true,
  className,
}: {
  item: AccountNavItem;
  active: boolean;
  onSelect: (route: AccountRoute) => void;
  showMeta?: boolean;
  className?: string;
}) {
  return (
    <Button
      aria-current={active ? "page" : undefined}
      className={className ?? "w-full justify-start gap-3 text-left"}
      onClick={() => onSelect(item.route)}
      type="button"
      variant={active ? "default" : "ghost"}
    >
      <span>{item.label}</span>
      {showMeta && item.count ? (
        <span className="ml-auto font-mono text-[10px] tabular-nums">{item.count}</span>
      ) : null}
      {showMeta && item.dot ? (
        <span
          aria-label="Unread notifications"
          className="ml-auto size-2 rounded-full bg-[var(--acc-oxblood)]"
          role="img"
        />
      ) : null}
    </Button>
  );
}

export function AccountSidebar() {
  const { currentRoute, navigate } = useAccountUi();

  return (
    <aside className="hidden md:block">
      <div className="sticky top-24 overflow-hidden rounded-[14px] border border-[var(--acc-line)] bg-[var(--acc-surface)] shadow-[var(--acc-shadow-sm)]">
        <div className="border-b border-[var(--acc-line)] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--acc-sage)] text-sm font-bold text-[var(--acc-sage-deep)]">
              AO
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Ada Okafor</p>
              <p className="mt-1 truncate text-sm text-[var(--acc-muted)]">Customer since 2024</p>
            </div>
          </div>
        </div>
        <nav aria-label="Account" className="p-2.5">
          {accountNavItems.map((item) => (
            <SidebarLink
              active={currentRoute === item.route}
              item={item}
              key={item.route}
              onSelect={navigate}
            />
          ))}
        </nav>
        <div className="border-t border-[var(--acc-line)] p-2.5">
          <form action="/auth/sign-out" method="post">
            <input name="next" type="hidden" value="/" />
            <Button className="w-full justify-start gap-3 text-left" type="submit" variant="ghost">
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
