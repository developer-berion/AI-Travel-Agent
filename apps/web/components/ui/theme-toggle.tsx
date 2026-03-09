"use client";

import { useTheme } from "./theme-provider";

export const ThemeToggle = () => {
  const { isHydrated, theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      className="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <span className="theme-toggle-label">Theme</span>
      <strong>{isHydrated ? nextTheme : "dark"} mode</strong>
    </button>
  );
};
