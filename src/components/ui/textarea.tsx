import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex field-sizing-content w-full rounded-lg border border-input bg-control px-2.5 py-2 text-base text-control-foreground transition-colors outline-none placeholder:text-muted-foreground hover:bg-control-hover focus-visible:border-ring focus-visible:bg-control focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/30 data-[valid=true]:border-success data-[valid=true]:ring-3 data-[valid=true]:ring-success/20 data-[valid=true]:focus-visible:border-success data-[valid=true]:focus-visible:ring-success/30 md:text-sm",
  {
    variants: {
      textareaSize: {
        sm: "min-h-16",
        default: "min-h-20",
        lg: "min-h-28",
      },
    },
    defaultVariants: {
      textareaSize: "default",
    },
  },
);

type TextareaProps = React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants> & {
    /** Marks the field as passing validation; renders the success border/ring. Never pass alongside `aria-invalid`. */
    isValid?: boolean;
  };

function Textarea({ className, textareaSize, isValid, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-valid={isValid ? "true" : undefined}
      className={cn(textareaVariants({ textareaSize }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
