import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-control px-2.5 py-2 text-base text-control-foreground transition-colors outline-none placeholder:text-muted-foreground hover:bg-control-hover focus-visible:border-ring focus-visible:bg-control focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
