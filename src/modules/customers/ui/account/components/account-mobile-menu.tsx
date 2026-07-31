"use client";

import { XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useAccountUi } from "../account-context";
import { type AccountRoute, accountNavItems } from "../account-nav";
import { AcctButton, Eyebrow, IconButton } from "./account-primitives";
import { SidebarLink } from "./account-sidebar";

export function AccountMobileMenu({
  displayName,
  open,
  onOpenChange,
}: {
  displayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentRoute, navigate } = useAccountUi();

  function select(route: AccountRoute) {
    navigate(route);
    onOpenChange(false);
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="lst-account max-h-[92vh] gap-0 overflow-y-auto rounded-t-[24px] border-t border-[var(--acc-line)] bg-[var(--acc-surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--acc-ink)] shadow-[var(--acc-shadow-md)]"
        showCloseButton={false}
        side="bottom"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <Eyebrow className="text-[var(--acc-muted)]">Signed in as {displayName}</Eyebrow>
            <SheetTitle className="mt-2 font-serif text-4xl font-normal text-[var(--acc-ink)]">
              Account
            </SheetTitle>
          </div>
          <IconButton aria-label="Close account menu" onClick={() => onOpenChange(false)}>
            <XIcon className="size-[19px]" />
          </IconButton>
        </div>
        <SheetDescription className="sr-only">Account navigation</SheetDescription>
        <nav aria-label="Mobile account" className="mt-6 grid gap-1">
          {accountNavItems.map((item) => (
            <SidebarLink
              active={currentRoute === item.route}
              item={item}
              key={item.route}
              onSelect={select}
            />
          ))}
        </nav>
        <form action="/auth/sign-out" className="mt-6" method="post">
          <input name="next" type="hidden" value="/" />
          <AcctButton className="w-full" type="submit" variant="danger">
            Sign out
          </AcctButton>
        </form>
      </SheetContent>
    </Sheet>
  );
}
