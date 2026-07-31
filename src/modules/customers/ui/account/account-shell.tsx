"use client";

import { MenuIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/providers/session-provider";
import { AccountUiProvider } from "./account-context";
import { type AccountModalId, type AccountRoute, routeFromPathname, routePaths } from "./account-nav";
import { AccountBreadcrumb } from "./components/account-breadcrumb";
import { AccountMobileMenu } from "./components/account-mobile-menu";
import { IconButton, monoClass } from "./components/account-primitives";
import { AccountSidebar } from "./components/account-sidebar";
import { AccountModals } from "./modals/account-modals";

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const currentRoute = routeFromPathname(pathname);
  const [modal, setModal] = useState<AccountModalId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const displayName =
    session.displayName?.trim() || session.email?.split("@")[0]?.trim() || "Customer";

  function navigate(route: AccountRoute) {
    router.push(routePaths[route]);
  }

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const accountUi = useMemo(
    () => ({
      currentRoute,
      modal,
      navigate,
      openModal: setModal,
      closeModal: () => setModal(null),
      toast: setToastMessage,
    }),
    [currentRoute, modal],
  );

  return (
    <AccountUiProvider value={accountUi}>
      <div className="lst-account min-h-screen bg-[var(--acc-bone)] text-[var(--acc-ink)]">
        <header className="sticky top-0 z-30 border-b border-[var(--acc-line)] bg-[var(--acc-bone)]/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className={monoClass}>Account</p>
              <p className="mt-1 truncate font-serif text-xl">{displayName}</p>
            </div>
            <IconButton aria-label="Open account menu" onClick={() => setMenuOpen(true)}>
              <MenuIcon className="size-[19px]" />
            </IconButton>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-6 sm:px-6 md:grid-cols-[260px_minmax(0,1fr)] md:px-8 md:py-10">
          <AccountSidebar displayName={displayName} email={session.email} />
          <main className="min-w-0">
            <AccountBreadcrumb />
            <div className="mt-6">{children}</div>
          </main>
        </div>

        <AccountMobileMenu
          displayName={displayName}
          onOpenChange={setMenuOpen}
          open={menuOpen}
        />
        <AccountModals modal={modal} onClose={() => setModal(null)} />
        {toastMessage ? (
          <div
            aria-live="polite"
            className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[var(--acc-ink)] px-5 py-3 text-sm text-[var(--acc-surface)] shadow-[var(--acc-shadow-md)]"
          >
            {toastMessage}
          </div>
        ) : null}
      </div>
    </AccountUiProvider>
  );
}
