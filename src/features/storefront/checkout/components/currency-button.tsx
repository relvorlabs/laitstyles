import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function CurrencyButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button size="lg" onClick={onClick} variant={active ? "default" : "outline"}>
      {children}
    </Button>
  );
}
