"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AccountOrderItemReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => console.error(error), [error]);
  return (
    <Alert className="mx-auto mt-8 max-w-2xl p-5" variant="destructive">
      <HugeiconsIcon aria-hidden="true" icon={Alert02Icon} />
      <AlertTitle>We couldn’t load this review</AlertTitle>
      <AlertDescription>
        <p>No review information was changed. Try again or return to your orders.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={reset} size="lg" type="button">
            Try again
          </Button>
          <Link
            className={buttonVariants({ variant: "outline", size: "lg" })}
            href="/account/orders"
          >
            Back to orders
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
