"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AccountOrderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Alert variant="destructive" className="mx-auto mt-8 max-w-2xl p-5">
      <HugeiconsIcon aria-hidden="true" icon={Alert02Icon} />
      <AlertTitle>We couldn’t load this order</AlertTitle>
      <AlertDescription>
        <p>No order or review information was changed. Try again or return to order history.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" size="lg" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/account/orders"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Back to orders
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
