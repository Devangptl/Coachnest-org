"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(resolved: "dark" | "light") {
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  html.classList.add(resolved);
}

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(t: Theme): "dark" | "light" {
  return t === "system" ? getSystemPreference() : t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  // On mount: load saved preference, apply it
  useEffect(() => {
    const saved = (localStorage.getItem("cn-theme") as Theme | null) ?? "system";
    const resolved = resolve(saved);
    setThemeState(saved);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for OS-level colour scheme changes (matters when theme === "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      setThemeState((current) => {
        if (current === "system") {
          const resolved = getSystemPreference();
          setResolvedTheme(resolved);
          applyTheme(resolved);
        }
        return current;
      });
    }
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  function setTheme(t: Theme) {
    const resolved = resolve(t);
    setThemeState(t);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    localStorage.setItem("cn-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
