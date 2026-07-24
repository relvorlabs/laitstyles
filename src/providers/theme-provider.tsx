"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  setTheme: (theme: ThemePreference) => void;
};

const STORAGE_KEY = "laitstyle-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableColorScheme
      enableSystem
      storageKey={STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme(): ThemeContextValue {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );

  return {
    theme: isThemePreference(theme) ? theme : "system",
    resolvedTheme: resolvedTheme === "dark" ? "dark" : "light",
    mounted,
    setTheme: (nextTheme) => setTheme(nextTheme),
  };
}

function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function subscribeMounted() {
  return () => {};
}

function getClientMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}
