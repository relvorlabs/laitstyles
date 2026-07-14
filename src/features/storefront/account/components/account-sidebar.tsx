"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountUi } from "../account-context";
import { type AccountNavItem, type AccountRoute, accountNavItems } from "../account-nav";

const sidebarLinkBase =
  "relative min-h-[46px] w-full justify-start gap-3 rounded-[10px] px-[.8rem] py-[.7rem] text-left text-[.92rem] font-[560] transition-[background-color,color,transform] duration-200";

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
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item.route)}
      variant={active ? "default" : "ghost"}
      className={cn(
        // `acc-sidebar-link` carries contextual account colours while the Button
        // variant supplies focus, disabled and icon behaviour consistently.
        sidebarLinkBase,
        "acc-sidebar-link",
        active ? "bg-[var(--acc-ink)]" : "hover:translate-x-0.5 hover:bg-[var(--acc-bone-2)]",
        className,
      )}
    >
      <span>{item.label}</span>
      {showMeta && item.count ? (
        <span className="ml-auto font-mono text-[10px] tabular-nums">{item.count}</span>
      ) : null}
      {showMeta && item.dot ? (
        <span
          role="img"
          aria-label="Unread notifications"
          className="ml-auto size-2 rounded-full bg-[var(--acc-oxblood)]"
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

        <nav className="p-2.5" aria-label="Account">
          {accountNavItems.map((item) => (
            <SidebarLink
              key={item.route}
              item={item}
              active={currentRoute === item.route}
              onSelect={navigate}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--acc-line)] p-2.5">
          <form action="/auth/sign-out" method="post">
            <input name="next" type="hidden" value="/" />
            <Button
              type="submit"
              variant="ghost"
              className={cn(
                sidebarLinkBase,
                "acc-fg-oxblood hover:translate-x-0.5 hover:bg-[var(--acc-bone-2)]",
              )}
            >
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
