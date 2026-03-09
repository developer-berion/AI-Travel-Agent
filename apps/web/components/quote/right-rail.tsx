import type { QuoteRecord } from "@alana/database";

export const RightRail = ({
  record,
}: {
  record: QuoteRecord;
}) => {
  const blockers = record.intake?.missingFields ?? [];

  return (
    <aside className="right-rail">
      <section className="rail-card">
        <p className="eyebrow">Thread summary</p>
        <h3>{record.session.title}</h3>
        <p className="muted">{record.session.latestContextSummary}</p>
      </section>

      <section className="rail-card">
        <p className="eyebrow">Status</p>
        <ul className="status-list">
          <li>
            <span>Session</span>
            <strong>{record.session.status}</strong>
          </li>
          <li>
            <span>Commercial</span>
            <strong>{record.session.commercialStatus}</strong>
          </li>
          <li>
            <span>Quote version</span>
            <strong>v{record.session.activeQuoteVersion}</strong>
          </li>
          <li>
            <span>Recommendation mode</span>
            <strong>{record.session.recommendationMode}</strong>
          </li>
        </ul>
      </section>

      <section className="rail-card">
        <p className="eyebrow">Readiness</p>
        {blockers.length === 0 ? (
          <p className="success-text">No active blockers in the mock slice.</p>
        ) : (
          <ul className="card-list">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
        {record.session.pendingQuestion ? (
          <p className="muted">{record.session.pendingQuestion}</p>
        ) : null}
      </section>
    </aside>
  );
};
