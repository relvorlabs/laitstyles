"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ReturnsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-12 sm:px-6 lg:px-8">
      <Card className="items-start p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
          Returns unavailable
        </p>
        <h1 className="mt-3 font-serif text-[34px] font-medium leading-tight">
          The return workspace could not be loaded.
        </h1>
        <p className="mt-4 max-w-[620px] text-[12.5px] leading-6 text-muted-foreground">
          {error.message || "The session return records encountered an unexpected error."}
        </p>
        <Button size="lg" className="mt-6" onClick={reset} type="button">
          Try again
        </Button>
      </Card>
    </div>
  );
}
