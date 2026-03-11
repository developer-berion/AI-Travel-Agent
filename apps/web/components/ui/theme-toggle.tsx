"use client";

import { useTheme } from "./theme-provider";

export const ThemeToggle = () => {
  const { isHydrated, theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";
  const nextLabel = nextTheme === "dark" ? "oscuro" : "claro";
  const currentLabel = theme === "dark" ? "Oscuro" : "Claro";

  return (
    <button
      aria-label={`Cambiar a modo ${nextLabel}`}
      aria-pressed={theme === "dark"}
      className="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle-icon">
        {theme === "dark" ? "☾" : "☀"}
      </span>
      <span className="theme-toggle-copy">
        <span className="theme-toggle-label">Tema</span>
        <strong>{isHydrated ? currentLabel : "Claro"}</strong>
      </span>
    </button>
  );
};
