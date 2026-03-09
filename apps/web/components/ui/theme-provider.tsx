"use client";

import {
  type ReactNode,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  isHydrated: boolean;
  setTheme: (nextTheme: ThemeMode) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
};

const STORAGE_KEY = "alana.theme.mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark";

const resolveInitialTheme = (): ThemeMode => {
  const storedTheme = window.localStorage.getItem(STORAGE_KEY);

  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (theme: ThemeMode) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export const ThemeProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const initialTheme = resolveInitialTheme();
    applyTheme(initialTheme);
    setThemeState(initialTheme);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [isHydrated, theme]);

  const setTheme = (nextTheme: ThemeMode) => {
    startTransition(() => {
      setThemeState(nextTheme);
    });
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        isHydrated,
        setTheme,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
};
