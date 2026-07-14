"use client";

import { XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useAccountUi } from "../account-context";
import { type AccountRoute, accountNavItems } from "../account-nav";
import { AcctButton, Eyebrow, IconButton } from "./account-primitives";
import { SidebarLink } from "./account-sidebar";

// Mobile account navigation — the bottom sheet from the prototype
// (`#account-menu`). Base UI's Dialog-backed Sheet provides focus trap, Escape
// and restore; navigating closes the sheet exactly as the prototype did.
export function AccountMobileMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentRoute, navigate, toast } = useAccountUi();

  function select(route: AccountRoute) {
    navigate(route);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="lst-account max-h-[92vh] gap-0 overflow-y-auto rounded-t-[24px] border-t border-[var(--acc-line)] bg-[var(--acc-surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--acc-ink)] shadow-[var(--acc-shadow-md)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <Eyebrow className="text-[var(--acc-muted)]">Signed in as Ada</Eyebrow>
            <SheetTitle className="mt-2 font-serif text-4xl font-normal text-[var(--acc-ink)]">
              Account
            </SheetTitle>
          </div>
          <IconButton onClick={() => onOpenChange(false)} aria-label="Close account menu">
            <XIcon className="size-[19px]" />
          </IconButton>
        </div>
        <SheetDescription className="sr-only">Account navigation</SheetDescription>

        <nav className="mt-6 grid gap-1" aria-label="Mobile account">
          {accountNavItems.map((item) => (
            <SidebarLink
              key={item.route}
              item={item}
              active={currentRoute === item.route}
              onSelect={select}
              showMeta={false}
            />
          ))}
        </nav>

        <AcctButton
          variant="danger"
          className="mt-6 w-full"
          onClick={() => {
            toast("Current-session sign-out selected");
            onOpenChange(false);
          }}
        >
          Sign out
        </AcctButton>
      </SheetContent>
    </Sheet>
  );
}
