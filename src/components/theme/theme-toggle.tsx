"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
    description: "Bone surfaces with Ink text",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Ink surfaces with Bone text",
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
          "size-11 rounded-full bg-background/88",
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Colour theme</DropdownMenuLabel>
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
                className="items-start py-2.5"
                key={option.value}
                value={option.value}
              >
                <OptionIcon aria-hidden="true" className="mt-0.5" />
                <span>
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
