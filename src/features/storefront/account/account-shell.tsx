"use client";

import { ChevronDownIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AccountSecurityModals,
  isAccountSecurityModalId,
} from "@/modules/auth/ui/account-security-modals";
import { type AccountModalId, AccountUiProvider } from "./account-context";
import { type AccountRoute, routeFromPathname, routePaths, routeTitles } from "./account-nav";
import { AccountBreadcrumb } from "./components/account-breadcrumb";
import { AccountMobileMenu } from "./components/account-mobile-menu";
import { AcctButton, eyebrowClass } from "./components/account-primitives";
import { AccountSidebar } from "./components/account-sidebar";
import { AccountModals } from "./modals/account-modals";

// The account chrome (breadcrumb, sidebar, mobile menu, modals, toast), now
// wrapping real `/account/**` route segments instead of switching over an
// in-memory `AccountRoute` state. `navigate()` still takes an `AccountRoute`
// so every section/modal/nav call site is unchanged; it resolves to a real
// URL via `routePaths` and pushes it through the Next router.
export function AccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentRoute = routeFromPathname(pathname);

  const [modal, setModal] = useState<AccountModalId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastState, setToastState] = useState({ message: "", visible: false });

  const sectionRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const toastTimer = useRef<number>(undefined);

  // Keep document title in sync; scroll and move focus to the heading only
  // after a user-initiated navigation (not the initial load).
  useEffect(() => {
    document.title = `${routeTitles[currentRoute]} — Laitstyle Account`;
    if (pendingFocus.current) {
      pendingFocus.current = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      const heading = sectionRef.current?.querySelector("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }, [currentRoute]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const navigate = useCallback(
    (next: AccountRoute) => {
      pendingFocus.current = true;
      router.push(routePaths[next]);
      setMenuOpen(false);
    },
    [router],
  );

  const toast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToastState({ message, visible: true });
    toastTimer.current = window.setTimeout(
      () => setToastState((s) => ({ ...s, visible: false })),
      2600,
    );
  }, []);

  const ui = useMemo(
    () => ({
      currentRoute,
      navigate,
      openModal: (id: AccountModalId) => setModal(id),
      closeModal: () => setModal(null),
      toast,
    }),
    [currentRoute, navigate, toast],
  );

  return (
    <AccountUiProvider value={ui}>
      <div className="lst-account w-full bg-[radial-gradient(circle_at_12%_0%,rgba(214,228,166,.38),transparent_30rem)]">
        <div className="mx-auto max-w-[1520px] px-4 py-5 sm:px-6 lg:px-8">
          <AccountBreadcrumb />
        </div>

        <div className="mx-auto grid max-w-[1520px] gap-6 px-4 pb-16 sm:px-6 md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
          <AccountSidebar />

          <main id="account-content" className="min-w-0">
            {/* Mobile title + menu trigger */}
            <div className="mb-5 flex items-center justify-between gap-4 md:hidden">
              <div>
                <p className={cn(eyebrowClass, "text-[var(--acc-muted)]")}>Account</p>
                <h1 className="mt-2 font-serif text-4xl font-normal leading-none">
                  {routeTitles[currentRoute]}
                </h1>
              </div>
              <AcctButton
                variant="secondary"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                Menu
                <ChevronDownIcon className="size-4" strokeWidth={1.8} />
              </AcctButton>
            </div>

            <div
              key={pathname}
              ref={sectionRef}
              className="animate-[leemRise_.34s_cubic-bezier(.22,.8,.24,1)_both]"
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      <AccountMobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <AccountModals modal={modal} onClose={() => setModal(null)} />
      <AccountSecurityModals
        modal={isAccountSecurityModalId(modal) ? modal : null}
        onClose={() => setModal(null)}
        onNotice={toast}
      />

      {/* Toast (bottom-center pill) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="lst-account fixed bottom-5 left-1/2 z-[130] w-[min(92vw,440px)] -translate-x-1/2"
      >
        <div
          hidden={!toastState.message}
          className={cn(
            "rounded-full bg-[var(--acc-ink)] px-5 py-3 text-center text-sm font-semibold text-[var(--acc-bone)] shadow-xl transition-[opacity,transform] duration-200",
            toastState.visible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3.5 opacity-0",
          )}
        >
          {toastState.message}
        </div>
      </div>
    </AccountUiProvider>
  );
}
