"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useTheme,
  type ThemePreference,
} from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const themeOptions: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  description: string;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Warm Bone canvas with Ink text",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Layered Ink surfaces with Bone text",
  },
  {
    value: "system",
    label: "System",
    description: "Follow this device",
  },
];

export function ThemeToggle({
  className,
  align = "end",
}: {
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const { mounted, resolvedTheme, setTheme, theme } = useTheme();
  const Icon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change colour theme"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-lg" }),
          "size-11 rounded-full bg-control text-control-foreground hover:bg-control-hover",
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Appearance
            </span>
            <span className="mt-1 block text-sm font-medium text-foreground">
              Choose how Laitstyle looks here.
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          onValueChange={(value) => setTheme(value as ThemePreference)}
          value={theme}
        >
          {themeOptions.map((option) => {
            const OptionIcon =
              option.value === "light"
                ? Sun
                : option.value === "dark"
                  ? Moon
                  : LaptopMinimal;
            return (
              <DropdownMenuRadioItem
                className="items-start gap-3 px-2.5 py-3"
                key={option.value}
                value={option.value}
              >
                <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-surface-interactive text-surface-interactive-foreground">
                  <OptionIcon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
