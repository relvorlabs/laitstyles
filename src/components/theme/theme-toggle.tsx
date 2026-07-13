"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "@/components/theme/theme-provider";
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
    <button
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      className={cn(
        "grid size-11 place-items-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--sage-light)]",
        className,
      )}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
      type="button"
    >
      <HugeiconsIcon
        aria-hidden="true"
        icon={dark ? Sun03Icon : Moon02Icon}
        size={19}
        strokeWidth={1.6}
      />
    </button>
  );
}
