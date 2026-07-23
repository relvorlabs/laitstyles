"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAccountUi } from "../account-context";
import { routeTitles } from "../account-nav";

// Breadcrumb: Home / Account / <current>. "Home" is a real link to the
// storefront root; "Account" returns to the overview section.
export function AccountBreadcrumb() {
  const { currentRoute, navigate } = useAccountUi();

  return (
    <nav className="text-sm text-[var(--acc-muted)]" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        <li>
          <Link href="/" className="hover:text-[var(--acc-ink)]">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Button size="lg" type="button" onClick={() => navigate("overview")} variant="link">
            Account
          </Button>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">/</span>
          <span className="text-[var(--acc-ink)]">{routeTitles[currentRoute]}</span>
        </li>
      </ol>
    </nav>
  );
}
