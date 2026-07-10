"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isThemePreference(stored)) setThemeState(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia(DARK_QUERY);
    const applyTheme = () => {
      const nextResolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
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

export const themeBootScript = `
(function () {
  try {
    var preference = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var dark = preference === 'dark' || (preference === 'system' && matchMedia('${DARK_QUERY}').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {}
})();`;

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
