"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "conversation",
    label: "Conversación",
  },
  {
    href: "case",
    label: "Hoja de caso",
  },
  {
    href: "quote",
    label: "Propuesta",
  },
  {
    href: "versions",
    label: "Historial",
  },
];

export const QuoteSessionLocalNav = ({
  quoteSessionId,
}: {
  quoteSessionId: string;
}) => {
  const pathname = usePathname();

  return (
    <nav className="local-nav">
      {links.map((link) => {
        const href = `/quotes/${quoteSessionId}/${link.href}`;
        return (
          <Link
            className={clsx("local-nav-link", pathname === href && "active")}
            href={href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
