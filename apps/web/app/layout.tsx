import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "./globals.css";

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Alana Travel Quoting OS",
  description:
    "Operator-facing AI quoting workspace for hotels, transfers, and activities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html data-theme="light" lang="es" suppressHydrationWarning>
      <body className={`app-body ${sansFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
