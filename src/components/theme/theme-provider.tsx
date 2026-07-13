"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  setTheme: (theme: ThemePreference) => void;
};

const STORAGE_KEY = "laitstyle-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getInitialThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia(DARK_QUERY);
    const applyTheme = () => {
      const nextResolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      const root = document.documentElement;
      root.classList.toggle("dark", nextResolved === "dark");
      root.dataset.theme = nextResolved;
      root.style.colorScheme = nextResolved;
      setResolvedTheme(nextResolved);
    };

    applyTheme();
    window.localStorage.setItem(STORAGE_KEY, theme);

    if (theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [mounted, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      mounted,
      setTheme: setThemeState,
    }),
    [mounted, resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getInitialThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
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
