"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; isDark: boolean; toggle: () => void }>({ theme: "dark", isDark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("kmu-theme") as Theme) || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("kmu-theme", next);
      return next;
    });
  }, []);
  return <ThemeCtx.Provider value={{ theme, isDark: theme === "dark", toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="테마 전환"
      className="chip mono" style={{ cursor: "pointer", padding: "0.3rem 0.6rem" }}>
      {isDark ? "◐ 다크" : "◑ 라이트"}
    </button>
  );
}
