import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "./globals.css";

const sansFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
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
    <html data-theme="light" lang="en" suppressHydrationWarning>
      <body className={`app-body ${sansFont.variable} ${monoFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
