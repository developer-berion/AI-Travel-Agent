import { notFound } from "next/navigation";

import { ArchiveQuoteButton } from "@/components/chat/archive-quote-button";
import { MessageComposer } from "@/components/chat/message-composer";
import { CompareTray } from "@/components/quote/compare-tray";
import { RightRail } from "@/components/quote/right-rail";
import { ShortlistCard } from "@/components/quote/shortlist-card";
import { requireOperator } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";
import type { QuoteRecord } from "@alana/database";

const SummaryBar = ({ record }: { record: QuoteRecord }) => (
  <section className="summary-bar">
    <div>
      <p className="eyebrow">Thread summary</p>
      <h2>{record.session.tripLabel}</h2>
      <p className="muted">{record.session.latestContextSummary}</p>
    </div>
    <div className="summary-metrics">
      <div>
        <span>Status</span>
        <strong>{record.session.status}</strong>
      </div>
      <div>
        <span>Commercial</span>
        <strong>{record.session.commercialStatus}</strong>
      </div>
      <div>
        <span>Active quote</span>
        <strong>v{record.session.activeQuoteVersion}</strong>
      </div>
    </div>
  </section>
);

export default async function QuoteSessionPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string }>;
}) {
  const operator = await requireOperator();
  const { quoteSessionId } = await params;
  const repository = await getQuoteRepository();
  const record = await repository.getRecord(quoteSessionId);

  if (!record || record.session.operatorId !== operator.id) {
    notFound();
  }

  return (
    <section className="workspace-grid">
      <div className="conversation-column">
        <SummaryBar record={record} />

        <section className="thread-card">
          <div className="thread-actions">
            <div>
              <p className="eyebrow">Conversation</p>
              <h3>{record.session.title}</h3>
            </div>
            <ArchiveQuoteButton quoteSessionId={record.session.id} />
          </div>

          <div className="message-list">
            {record.messages.length === 0 ? (
              <div className="empty-panel compact">
                Send the first traveler request to start intake and readiness
                validation.
              </div>
            ) : (
              record.messages.map((message) => (
                <article
                  className={`message-bubble ${message.role}`}
                  key={message.id}
                >
                  <span>{message.role}</span>
                  <p>{message.content}</p>
                </article>
              ))
            )}
          </div>

          <MessageComposer
            quoteSessionId={record.session.id}
            status={record.session.status}
          />
        </section>

        {record.shortlists.length > 0 ? (
          <section className="results-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Shortlists</p>
                <h3>Supplier-grounded options</h3>
              </div>
            </div>
            {record.shortlists.map((shortlist) => (
              <div className="shortlist-group" key={shortlist.id}>
                <div className="shortlist-title">
                  <strong>{shortlist.serviceLine}</strong>
                  {shortlist.reason ? <span>{shortlist.reason}</span> : null}
                </div>
                <div className="shortlist-grid">
                  {shortlist.items.map((option) => (
                    <ShortlistCard
                      isSelectedForQuote={record.selectedItems.some(
                        (item) => item.id === option.id,
                      )}
                      key={option.id}
                      option={option}
                      quoteSessionId={record.session.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <CompareTray shortlists={record.shortlists} />
      </div>

      <RightRail record={record} />
    </section>
  );
}
