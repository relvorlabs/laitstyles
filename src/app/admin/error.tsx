"use client";

import { Alert02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

export default function AdminOverviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[900px] items-center px-4 py-10 sm:px-6 lg:px-8">
      <Empty className="min-h-[480px] border border-border bg-card shadow-[0_24px_70px_rgba(27,26,23,.08)]">
        <EmptyHeader>
          <EmptyMedia className="grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AdminIcon icon={Alert02Icon} size={27} />
          </EmptyMedia>
          <EmptyTitle className="font-serif text-[32px] font-medium">
            The daily view could not be assembled.
          </EmptyTitle>
          <EmptyDescription className="max-w-[500px]">
            Your store records have not been changed. Retry the Overview, or open the storefront
            while this workspace recovers.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-2 flex-row flex-wrap justify-center">
          <Button onClick={reset} size="lg" type="button">
            Retry Overview
          </Button>
          <Button nativeButton={false} render={<Link href="/" />} size="lg" variant="outline">
            Preview storefront
            <AdminIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
