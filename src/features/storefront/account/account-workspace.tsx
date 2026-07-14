"use client";

import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type AccountModalId, AccountUiProvider } from "./account-context";
import { type AccountRoute, isAccountRoute, routeTitles } from "./account-nav";
import { AccountBreadcrumb } from "./components/account-breadcrumb";
import { AccountMobileMenu } from "./components/account-mobile-menu";
import { AcctButton, eyebrowClass } from "./components/account-primitives";
import { AccountSidebar } from "./components/account-sidebar";
import { AccountModals } from "./modals/account-modals";
import { AddressesSection } from "./sections/addresses-section";
import { NotificationsSection } from "./sections/notifications-section";
import { OrderDetailSection } from "./sections/order-detail-section";
import { OrdersSection } from "./sections/orders-section";
import { OverviewSection } from "./sections/overview-section";
import { PaymentsSection } from "./sections/payments-section";
import { PreferencesSection } from "./sections/preferences-section";
import { PrivacySection } from "./sections/privacy-section";
import { ProfileSection } from "./sections/profile-section";
import { ReturnDetailSection } from "./sections/return-detail-section";
import { ReturnsSection } from "./sections/returns-section";
import { SavedSection } from "./sections/saved-section";
import { SecuritySection } from "./sections/security-section";
import { SupportSection } from "./sections/support-section";
import { TicketDetailSection } from "./sections/ticket-detail-section";

function SectionForRoute({ route }: { route: AccountRoute }) {
  switch (route) {
    case "overview":
      return <OverviewSection />;
    case "profile":
      return <ProfileSection />;
    case "orders":
      return <OrdersSection />;
    case "order-detail":
      return <OrderDetailSection />;
    case "returns":
      return <ReturnsSection />;
    case "return-detail":
      return <ReturnDetailSection />;
    case "addresses":
      return <AddressesSection />;
    case "payments":
      return <PaymentsSection />;
    case "saved":
      return <SavedSection />;
    case "notifications":
      return <NotificationsSection />;
    case "preferences":
      return <PreferencesSection />;
    case "security":
      return <SecuritySection />;
    case "privacy":
      return <PrivacySection />;
    case "support":
      return <SupportSection />;
    case "ticket-detail":
      return <TicketDetailSection />;
  }
}

export function AccountWorkspace() {
  const [route, setRoute] = useState<AccountRoute>("overview");
  const [modal, setModal] = useState<AccountModalId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastState, setToastState] = useState({ message: "", visible: false });

  const sectionRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const toastTimer = useRef<number>(undefined);

  // Read the initial section from the hash on mount (deep links within the
  // prototype), mirroring the source `navigate(location.hash…)`.
  useEffect(() => {
    const initial = window.location.hash.replace("#", "");
    if (isAccountRoute(initial)) setRoute(initial);
  }, []);

  // Keep document title + hash in sync; scroll and move focus to the heading
  // only after a user-initiated navigation.
  useEffect(() => {
    document.title = `${routeTitles[route]} — Laitstyle Account`;
    window.history.replaceState(null, "", `#${route}`);
    if (pendingFocus.current) {
      pendingFocus.current = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      const heading = sectionRef.current?.querySelector("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }, [route]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const navigate = useCallback((next: AccountRoute) => {
    pendingFocus.current = true;
    setRoute(next);
    setMenuOpen(false);
  }, []);

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
      currentRoute: route,
      navigate,
      openModal: (id: AccountModalId) => setModal(id),
      closeModal: () => setModal(null),
      toast,
    }),
    [route, navigate, toast],
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
                  {routeTitles[route]}
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
              key={route}
              ref={sectionRef}
              className="animate-[leemRise_.34s_cubic-bezier(.22,.8,.24,1)_both]"
            >
              <SectionForRoute route={route} />
            </div>
          </main>
        </div>
      </div>

      <AccountMobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <AccountModals modal={modal} onClose={() => setModal(null)} />

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
