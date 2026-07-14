"use client";

// Shared presentational primitives for the account workspace. Each encodes the
// exact look of a reusable class from account-workspace.html while delegating
// interactive controls to the application-wide shadcn Button primitive.

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** `.field` — the shared input/select/textarea surface. */
export const fieldClass =
  "min-h-12 h-auto w-full rounded-[10px] border border-[var(--acc-line-strong)] bg-[var(--acc-surface)] px-[.9rem] py-[.78rem] text-base text-[var(--acc-ink)] shadow-none placeholder:text-muted-foreground focus-visible:border-[var(--acc-oxblood)] focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[color-mix(in_srgb,var(--acc-oxblood)_25%,transparent)]";

/** `.eyebrow` — Geist Mono, uppercase, tracked. */
export const eyebrowClass =
  "font-mono text-[.69rem] font-semibold uppercase leading-none tracking-[.13em]";

/** `.mono` — tabular monospaced numerics. */
export const monoClass = "font-mono tabular-nums";

export const panelClass =
  "rounded-[14px] border border-[var(--acc-line)] bg-[color-mix(in_srgb,var(--acc-surface)_88%,transparent)]";
export const panelElevatedClass =
  "rounded-[14px] border border-[var(--acc-line)] bg-[var(--acc-surface)] shadow-[var(--acc-shadow-sm)]";
export const softClass = "rounded-[10px] bg-[var(--acc-bone-2)]";

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(panelClass, className)} {...props} />;
}

export function PanelElevated({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(panelElevatedClass, className)} {...props} />;
}

export function Soft({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[10px] bg-[var(--acc-bone-2)]", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn(eyebrowClass, className)} {...props} />;
}

// ---- Buttons -------------------------------------------------------------
// Account buttons keep their original pill dimensions and role-specific palette,
// but use the same shadcn Button implementation as storefront and Admin.
const acctButton = cva(
  "min-h-12 rounded-full px-[1.1rem] py-3 text-base font-[650] whitespace-normal transition-[transform,border-color,background-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(.22,.8,.24,1)] focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--acc-oxblood)] disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      accountVariant: {
        primary:
          "border border-[var(--acc-ink)] bg-[var(--acc-ink)] enabled:hover:-translate-y-0.5 enabled:hover:bg-[var(--acc-ink)] enabled:hover:shadow-[0_12px_24px_var(--shadow-color)]",
        secondary:
          "border border-[var(--acc-line-strong)] bg-transparent enabled:hover:border-[var(--acc-ink)] enabled:hover:bg-[var(--acc-bone-2)]",
        danger:
          "border border-[var(--acc-danger)] bg-[var(--acc-danger)] enabled:hover:bg-[var(--acc-danger)]",
      },
    },
    defaultVariants: { accountVariant: "primary" },
  },
);

export type AcctButtonProps = Omit<ComponentProps<typeof Button>, "variant"> &
  VariantProps<typeof acctButton> & {
    variant?: "primary" | "secondary" | "danger";
  };

export function AcctButton({ className, variant = "primary", ...props }: AcctButtonProps) {
  const shadcnVariant =
    variant === "secondary" ? "outline" : variant === "danger" ? "destructive" : "default";

  return (
    <Button
      className={cn(acctButton({ accountVariant: variant, className }))}
      variant={shadcnVariant}
      {...props}
    />
  );
}

/** `.icon-btn` — 44px round control (used for modal close, mobile menu). */
export function IconButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "size-11 shrink-0 rounded-full border-[var(--acc-line)] bg-[color-mix(in_srgb,var(--acc-surface)_86%,transparent)] hover:-translate-y-0.5 hover:border-[var(--acc-ink)] hover:bg-[var(--acc-surface)] focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--acc-oxblood)]",
        className,
      )}
      size="icon-lg"
      variant="outline"
      {...props}
    />
  );
}

// ---- Status pill ---------------------------------------------------------
const status = cva(
  "inline-flex min-h-7 items-center gap-1.5 rounded-full px-[.7rem] py-[.3rem] font-mono text-[.67rem] font-semibold uppercase tracking-[.08em]",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--acc-bone-2)]",
        success: "bg-[var(--acc-sage)] text-[var(--acc-sage-deep)]",
        warning: "bg-[var(--acc-warning-surface)] text-[var(--acc-warning)]",
        danger: "bg-[var(--acc-danger-surface)] text-[var(--acc-danger)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type StatusVariant = NonNullable<VariantProps<typeof status>["variant"]>;

export function StatusBadge({
  variant,
  className,
  children,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof status>) {
  return (
    <span className={cn(status({ variant, className }))} {...props}>
      {children}
    </span>
  );
}

/**
 * Prototype product/anchor link. The source uses `href="#"` placeholders; we
 * keep them focusable and link-styled but prevent navigation so they don't
 * disturb the hash-based section routing.
 */
export function PlaceholderLink({ className, onClick, ...props }: ComponentProps<"a">) {
  return (
    // biome-ignore lint/a11y/useValidAnchor: intentional prototype placeholder link.
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      className={className}
      {...props}
    />
  );
}

// ---- Labeled field -------------------------------------------------------
export function LabeledField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-2 block text-sm text-[var(--acc-muted)]">{hint}</span> : null}
    </label>
  );
}

// ---- Timeline ------------------------------------------------------------
export function TimelineDot({
  state = "pending",
  children,
}: {
  state?: "complete" | "pending";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative z-[1] grid size-[31px] place-items-center rounded-full border text-sm",
        state === "complete"
          ? "border-[var(--acc-ink)] bg-[var(--acc-ink)] text-[var(--acc-bone)]"
          : "border-[var(--acc-line-strong)] bg-[var(--acc-surface)] text-[var(--acc-muted)]",
      )}
    >
      {children}
    </span>
  );
}

/** `.step-node` — 30px numbered node for the return wizard stepper. */
export function StepNode({
  state,
  children,
}: {
  state: "active" | "complete" | "idle";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "mx-auto grid size-[30px] place-items-center rounded-full border font-mono text-[.7rem]",
        state === "idle"
          ? "border-[var(--acc-line-strong)] bg-[var(--acc-surface)] text-[var(--acc-muted)]"
          : "border-[var(--acc-ink)] bg-[var(--acc-ink)] text-[var(--acc-bone)]",
      )}
    >
      {children}
    </span>
  );
}

/** `<ol class="progress-track">` — vertical connector line behind timeline dots. */
export function ProgressTrack({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "relative mt-6 space-y-5 before:absolute before:left-[15px] before:top-[22px] before:bottom-[22px] before:w-px before:bg-[var(--acc-line-strong)] before:content-['']",
        className,
      )}
      {...props}
    />
  );
}
