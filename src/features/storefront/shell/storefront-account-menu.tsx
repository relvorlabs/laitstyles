"use client";

import {
  FavouriteIcon,
  Logout03Icon,
  ShoppingBag03Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStorefrontAuth } from "@/features/storefront/shared/storefront-auth-provider";
import {
  useStorefrontCart,
  useStorefrontHolds,
  useStorefrontOverlay,
  useStorefrontSavedItems,
} from "@/features/storefront/shared/storefront-runtime";

export function StorefrontAccountMenu() {
  const router = useRouter();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const holds = useStorefrontHolds();
  const overlay = useStorefrontOverlay();
  const { actions, state } = useStorefrontAuth();
  const displayName = state.userName?.split(" ")[0] ?? state.userEmail?.split("@")[0] ?? "Account";
  const initial = displayName.slice(0, 1).toUpperCase();
  const holdCount = Object.keys(holds.secondsByProduct).length;

  if (!state.authReady) {
    return <span aria-label="Checking account" className="size-11 animate-pulse rounded-full bg-[var(--linen)]" role="status" />;
  }

  if (!state.signedIn) {
    return (
      <Button className="group gap-2 text-left max-[700px]:px-0" onClick={() => actions.openSignin(() => router.push("/account"))} type="button" variant="outline">
        <HugeiconsIcon aria-hidden="true" icon={UserIcon} size={19} strokeWidth={1.6} />
        <span className="leading-tight max-[700px]:hidden"><span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Welcome</span><span className="block text-xs font-semibold">Sign in</span></span>
        <span className="sr-only">Sign in or create an account</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Open ${displayName}'s account menu`} className="group inline-flex h-11 items-center gap-2 rounded-full border border-[var(--line)] px-2.5 pr-3 text-left transition-colors hover:bg-[var(--sage-light)] max-[700px]:size-11 max-[700px]:justify-center max-[700px]:px-0">
        <span className="grid size-7 place-items-center rounded-full bg-[var(--ink)] font-serif text-sm text-[var(--bone)]">{initial}</span>
        <span className="min-w-0 leading-tight max-[700px]:hidden"><span className="block max-w-24 truncate text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Your account</span><span className="block max-w-24 truncate text-xs font-semibold">Hi, {displayName}</span></span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] rounded-xl p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="rounded-lg bg-[var(--linen)] px-3 py-3 text-[var(--ink)]">
            <span className="block font-serif text-lg font-normal">Your Laitstyles rail</span>
            <span className="mt-1 block truncate text-[11px] font-normal text-[var(--muted)]">{state.userEmail}</span>
            <span className="mt-3 grid grid-cols-3 gap-2 text-center">
              <span className="rounded-md bg-[var(--bone)] px-2 py-2"><strong className="block text-sm text-[var(--ink)]">{holdCount}</strong><span className="text-[9px] uppercase tracking-wider">holds</span></span>
              <span className="rounded-md bg-[var(--bone)] px-2 py-2"><strong className="block text-sm text-[var(--ink)]">{saved.ids.length}</strong><span className="text-[9px] uppercase tracking-wider">saved</span></span>
              <span className="rounded-md bg-[var(--bone)] px-2 py-2"><strong className="block text-sm text-[var(--ink)]">{cart.count}</strong><span className="text-[9px] uppercase tracking-wider">in bag</span></span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-3 px-3 py-2.5" onClick={() => router.push("/account")}><HugeiconsIcon icon={UserIcon} size={17} strokeWidth={1.6} /><span><span className="block font-medium">Account overview</span><span className="block text-[11px] text-muted-foreground">Holds, orders and details</span></span></DropdownMenuItem>
          <DropdownMenuItem className="gap-3 px-3 py-2.5" onClick={() => overlay.open("savedDrawer")}><HugeiconsIcon icon={FavouriteIcon} size={17} strokeWidth={1.6} /><span><span className="block font-medium">Saved pieces</span><span className="block text-[11px] text-muted-foreground">Open your saved side sheet</span></span></DropdownMenuItem>
          <DropdownMenuItem className="gap-3 px-3 py-2.5" onClick={() => overlay.open("cartDrawer")}><HugeiconsIcon icon={ShoppingBag03Icon} size={17} strokeWidth={1.6} /><span><span className="block font-medium">Review bag</span><span className="block text-[11px] text-muted-foreground">{cart.count} items in this session</span></span></DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup><DropdownMenuItem className="gap-3 px-3 py-2.5" onClick={() => void actions.signOut()}><HugeiconsIcon icon={Logout03Icon} size={17} strokeWidth={1.6} />Sign out</DropdownMenuItem></DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
