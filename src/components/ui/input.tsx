import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "w-full min-w-0 rounded-lg border border-input bg-control text-control-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-control-hover focus-visible:border-ring focus-visible:bg-control focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/30 data-[valid=true]:border-success data-[valid=true]:ring-3 data-[valid=true]:ring-success/20 data-[valid=true]:focus-visible:border-success data-[valid=true]:focus-visible:ring-success/30 md:text-sm",
  {
    variants: {
      inputSize: {
        sm: "h-8 px-2.5 py-1 text-base",
        default: "h-10 px-3 py-1.5 text-base",
        lg: "h-11 px-3.5 py-2 text-base",
      },
    },
    defaultVariants: {
      inputSize: "default",
    },
  },
);

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants> & {
    /** Marks the field as passing validation; renders the success border/ring. Never pass alongside `aria-invalid`. */
    isValid?: boolean;
  };

function Input({ className, type, inputSize, isValid, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-valid={isValid ? "true" : undefined}
      className={cn(inputVariants({ inputSize }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
