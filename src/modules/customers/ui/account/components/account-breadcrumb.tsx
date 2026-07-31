"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAccountUi } from "../account-context";
import { routeTitles } from "../account-nav";

export function AccountBreadcrumb() {
  const { currentRoute, navigate } = useAccountUi();

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--acc-muted)]">
      <ol className="flex items-center gap-2">
        <li>
          <Link className="hover:text-[var(--acc-ink)]" href="/">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Button onClick={() => navigate("overview")} size="lg" type="button" variant="link">
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
