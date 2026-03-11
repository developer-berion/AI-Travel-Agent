import { buildActiveQuoteView } from "@alana/database";

import { ActiveQuoteReview } from "@/components/quote/active-quote-review";
import { ApplyRequoteChangeForm } from "@/components/quote/apply-requote-change-form";
import { CompareTray } from "@/components/quote/compare-tray";
import { CopyShareableSummaryButton } from "@/components/quote/copy-shareable-summary-button";
import { ExportQuoteButton } from "@/components/quote/export-quote-button";
import { QuoteCommandButton } from "@/components/quote/quote-command-button";
import { serviceLineUiLabels } from "@/lib/presentation";
import { getAuthorizedQuoteRecord } from "@/lib/quote-session";

export default async function QuoteReviewPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string }>;
}) {
  const { quoteSessionId } = await params;
  const { record } = await getAuthorizedQuoteRecord(quoteSessionId);
  const activeQuote = buildActiveQuoteView(record);
  const requestedServices = [
    ...new Set(record.shortlists.map((shortlist) => shortlist.serviceLine)),
  ];

  return (
    <section className="session-page-grid">
      <section className="conversation-column">
        <section className="quote-action-lanes">
          <CopyShareableSummaryButton summary={activeQuote.shareableSummary} />
          <div className="action-lane-card">
            <ExportQuoteButton quoteSessionId={record.session.id} />
            <p className="muted">
              El PDF se genera desde una versión congelada de la propuesta. Tras
              compartirlo, revisa si corresponde actualizar el estado comercial.
            </p>
          </div>
        </section>

        <ActiveQuoteReview quote={activeQuote} />

        {requestedServices.length > 0 ? (
          <section className="panel-card">
            <div className="panel-card-header">
              <div>
                <p className="eyebrow">Alternativas</p>
                <h3>Pedir más opciones por categoría</h3>
              </div>
            </div>
            <div className="card-actions">
              {requestedServices.map((serviceLine) => (
                <QuoteCommandButton
                  commandName="request_more_options"
                  key={serviceLine}
                  label={`Más opciones de ${serviceLineUiLabels[serviceLine]}`}
                  payload={{ serviceLine }}
                  quoteSessionId={record.session.id}
                />
              ))}
            </div>
          </section>
        ) : null}

        <CompareTray
          activeOptionIds={record.selectedItems.map((item) => item.id)}
          quoteSessionId={record.session.id}
          shortlists={record.shortlists}
        />

        <ApplyRequoteChangeForm quoteSessionId={record.session.id} />
      </section>
    </section>
  );
}
