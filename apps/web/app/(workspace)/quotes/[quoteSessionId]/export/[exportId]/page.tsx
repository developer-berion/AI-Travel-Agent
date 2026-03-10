import { notFound } from "next/navigation";

import { requireOperator } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  return `${(sizeInBytes / 1024).toFixed(1)} KB`;
};

export default async function QuoteExportPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string; exportId: string }>;
}) {
  const operator = await requireOperator();
  const { quoteSessionId, exportId } = await params;
  const repository = await getQuoteRepository();
  const record = await repository.getRecord(quoteSessionId);
  const quoteExport = await repository.getQuoteExport(quoteSessionId, exportId);
  const exportSnapshot = quoteExport
    ? await repository.getQuoteExportSnapshot(
        quoteSessionId,
        quoteExport.snapshotId,
      )
    : null;
  const pdfPath = `/api/quote-sessions/${quoteSessionId}/exports/${exportId}/pdf`;

  if (
    !record ||
    record.session.operatorId !== operator.id ||
    !quoteExport ||
    !exportSnapshot
  ) {
    notFound();
  }

  return (
    <section className="workspace-grid single-column">
      <section className="thread-card">
        <div className="thread-actions">
          <div>
            <p className="eyebrow">Quote export</p>
            <h2>{exportSnapshot.tripLabel}</h2>
            <p className="muted">{exportSnapshot.summary}</p>
          </div>
          <div className="card-actions">
            <a className="primary-button" href={pdfPath}>
              Download PDF
            </a>
          </div>
        </div>

        <div className="summary-metrics">
          <div>
            <span>Agency</span>
            <strong>{exportSnapshot.agencyName}</strong>
          </div>
          <div>
            <span>Version</span>
            <strong>v{quoteExport.activeQuoteVersion}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{new Date(quoteExport.createdAt).toLocaleString()}</strong>
          </div>
          <div>
            <span>Artifact</span>
            <strong>{quoteExport.fileName}</strong>
          </div>
          <div>
            <span>Size</span>
            <strong>{formatFileSize(quoteExport.fileSizeBytes)}</strong>
          </div>
        </div>

        <div className="results-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Selected bundle</p>
              <h3>Frozen export state</h3>
            </div>
          </div>

          <div className="shortlist-grid">
            {exportSnapshot.selectedItems.map((item) => (
              <article className="shortlist-card" key={item.id}>
                <header className="shortlist-header">
                  <div>
                    <p className="eyebrow">{item.serviceLine}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <strong>
                    {item.currency} {item.headlinePrice}
                  </strong>
                </header>
                <ul className="card-list">
                  <li>{item.whyItFits}</li>
                  <li>{item.tradeoff}</li>
                  {item.caveat ? <li>{item.caveat}</li> : null}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <section className="rail-card">
          <p className="eyebrow">Snapshot summary</p>
          <p className="muted">{exportSnapshot.confirmedStateSummary}</p>
          <ul className="status-list">
            <li>
              <span>Status at export</span>
              <strong>{exportSnapshot.status}</strong>
            </li>
            <li>
              <span>Commercial</span>
              <strong>{exportSnapshot.commercialStatus}</strong>
            </li>
            <li>
              <span>Recommendation mode</span>
              <strong>{exportSnapshot.recommendationMode}</strong>
            </li>
            <li>
              <span>Total</span>
              <strong>
                {exportSnapshot.bundleReview.currency}{" "}
                {exportSnapshot.bundleReview.totalPrice}
              </strong>
            </li>
            <li>
              <span>Storage path</span>
              <strong>{quoteExport.storagePath}</strong>
            </li>
          </ul>
          {exportSnapshot.bundleReview.warnings.length > 0 ? (
            <>
              <p className="eyebrow">Warnings</p>
              <ul className="card-list">
                {exportSnapshot.bundleReview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </section>
    </section>
  );
}
