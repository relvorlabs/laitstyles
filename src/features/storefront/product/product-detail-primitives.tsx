import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ProductInfoRow({
  title,
  body,
  onClick,
  icon,
}: {
  title: string;
  body: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="w-full justify-start gap-3 px-0 text-left"
      variant="ghost"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken">
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
      <span className="ml-auto" aria-hidden="true">
        ›
      </span>
    </Button>
  );
}

export function ProductDetailAccordion({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group" open={open}>
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-2xl" aria-hidden="true">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="max-w-3xl pb-6 leading-7 text-muted-foreground">{children}</div>
    </details>
  );
}
