"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/components/ui/query-provider";
import { ThemeProvider } from "@/components/ui/theme-provider";

export const Providers = ({
  children,
}: {
  children: ReactNode;
}) => (
  <ThemeProvider>
    <QueryProvider>{children}</QueryProvider>
  </ThemeProvider>
);
