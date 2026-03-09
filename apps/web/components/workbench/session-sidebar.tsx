"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  type QuoteSession,
  commercialStatusLabels,
  quoteStateLabels,
} from "@alana/domain";

import { NewQuoteButton } from "./new-quote-button";

export const SessionSidebar = ({
  sessions,
}: {
  sessions: QuoteSession[];
}) => {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Quotes</h2>
        </div>
        <NewQuoteButton />
      </div>

      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="empty-panel compact">
            No hay cotizaciones todavia. Crea la primera para abrir el hilo.
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = pathname === `/quotes/${session.id}`;
            return (
              <Link
                className={clsx("session-card", isActive && "active")}
                href={`/quotes/${session.id}`}
                key={session.id}
              >
                <div className="session-card-top">
                  <strong>{session.tripLabel}</strong>
                  <span>{quoteStateLabels[session.status]}</span>
                </div>
                <p>{session.agencyName}</p>
                <div className="session-card-meta">
                  <span>
                    {commercialStatusLabels[session.commercialStatus]}
                  </span>
                  <span>{session.tripStartDate ?? "Pending dates"}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
};
