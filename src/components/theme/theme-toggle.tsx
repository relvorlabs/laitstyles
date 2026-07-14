"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
}: {
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const { mounted, resolvedTheme, setTheme } = useTheme();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      className={cn(
        "size-11 rounded-full text-foreground transition-colors hover:bg-surface-selected",
        className,
      )}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
      size="icon-lg"
      type="button"
      variant="ghost"
    >
      <HugeiconsIcon
        aria-hidden="true"
        icon={dark ? Sun03Icon : Moon02Icon}
        size={19}
        strokeWidth={1.6}
      />
    </Button>
  );
}
