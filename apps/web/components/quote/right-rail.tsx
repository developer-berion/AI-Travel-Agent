import { type QuoteRecord, buildBundleReviewView } from "@alana/database";
import type { ServiceLine } from "@alana/domain";

const getServiceLineReadinessNote = (
  extractedFields: Record<string, unknown>,
  serviceLine: ServiceLine,
) => {
  const candidate = extractedFields[`${serviceLine}ReadinessNote`];
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
};

export const RightRail = ({
  record,
}: {
  record: QuoteRecord;
}) => {
  const blockers = record.intake?.missingFields ?? [];
  const bundleReview = buildBundleReviewView(record);
  const serviceReadiness =
    record.intake?.requestedServiceLines.map((serviceLine) => ({
      note: getServiceLineReadinessNote(
        record.intake?.extractedFields ?? {},
        serviceLine,
      ),
      serviceLine,
      state: record.intake?.readinessByServiceLine[serviceLine] ?? "blocked",
    })) ?? [];

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
        {serviceReadiness.length > 0 ? (
          <ul className="card-list">
            {serviceReadiness.map((item) => (
              <li key={item.serviceLine}>
                <strong>
                  {item.serviceLine}: {item.state}
                </strong>
                {item.note ? <p className="muted">{item.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : blockers.length === 0 ? (
          <p className="success-text">
            No active blockers in the current slice.
          </p>
        ) : null}
        {blockers.length > 0 ? (
          <ul className="card-list">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
        {record.session.pendingQuestion ? (
          <p className="muted">{record.session.pendingQuestion}</p>
        ) : null}
      </section>

      {bundleReview ? (
        <section className="rail-card">
          <p className="eyebrow">Bundle review</p>
          <p className="muted">
            {bundleReview.isExportReady
              ? "La seleccion actual ya puede pasar al siguiente paso de export."
              : "El bundle sigue en revision y todavia no esta listo para export."}
          </p>
          {bundleReview.selectedItems.length > 0 ? (
            <ul className="card-list">
              {bundleReview.selectedItems.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.serviceLine}: {item.title}
                  </strong>
                  <p className="muted">
                    {item.currency} {item.headlinePrice}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          {bundleReview.blockers.length > 0 ? (
            <ul className="card-list">
              {bundleReview.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
          {bundleReview.warnings.length > 0 ? (
            <ul className="card-list">
              {bundleReview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {bundleReview.currency ? (
            <p className="muted">
              Total bundle: {bundleReview.currency} {bundleReview.totalPrice}
            </p>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
};
