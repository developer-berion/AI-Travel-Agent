"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { type QuoteSession, commercialStatusLabels } from "@alana/domain";

import { formatUiDate, quoteStateUiLabels } from "@/lib/presentation";
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
          <p className="eyebrow">Mis casos</p>
          <h2>Cotizaciones</h2>
        </div>
        <NewQuoteButton />
      </div>

      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="empty-panel compact sidebar-empty">
            No hay cotizaciones todavía. Crea la primera para abrir el hilo.
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = pathname.startsWith(`/quotes/${session.id}`);

            return (
              <Link
                className={clsx("session-card", isActive && "active")}
                href={`/quotes/${session.id}/conversation`}
                key={session.id}
              >
                <div className="session-card-top">
                  <strong>{session.tripLabel}</strong>
                  <span className="session-state-pill">
                    {quoteStateUiLabels[session.status]}
                  </span>
                </div>
                <p>{session.latestContextSummary}</p>
                <div className="session-card-meta">
                  <span>
                    {commercialStatusLabels[session.commercialStatus]}
                  </span>
                  <span>{formatUiDate(session.tripStartDate)}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
};
