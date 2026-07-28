"use client";

import { Button } from "@/components/ui/button";

export default function CatalogueError({ reset }: { reset: () => void }) {
  return (
    <div role="alert">
      <p>Catalogue structure could not be loaded.</p>
      <Button onClick={reset} type="button">
        Try again
      </Button>
    </div>
  );
}
