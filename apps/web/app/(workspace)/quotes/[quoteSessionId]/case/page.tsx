import { buildCaseSheetView } from "@alana/database";

import { OperatorNotesPanel } from "@/components/quote/operator-notes-panel";
import { getAuthorizedQuoteRecord } from "@/lib/quote-session";

export default async function QuoteCasePage({
  params,
}: {
  params: Promise<{ quoteSessionId: string }>;
}) {
  const { quoteSessionId } = await params;
  const { record } = await getAuthorizedQuoteRecord(quoteSessionId);
  const caseSheet = buildCaseSheetView(record);

  return (
    <section className="session-page-grid case-page-grid">
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <p className="eyebrow">Hoja de caso</p>
            <h3>{caseSheet.title}</h3>
          </div>
          <span className="status-pill">{caseSheet.coverageState.label}</span>
        </div>

        <div className="case-sheet-grid">
          <section className="case-sheet-section">
            <p className="eyebrow">Datos confirmados</p>
            {caseSheet.confirmedFacts.length > 0 ? (
              <ul className="status-list">
                {caseSheet.confirmedFacts.map((fact) => (
                  <li key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                Todavia no hay facts confirmados visibles.
              </p>
            )}
          </section>

          <section className="case-sheet-section">
            <p className="eyebrow">Servicios solicitados</p>
            <div className="chip-row">
              {caseSheet.requestedServices.map((service) => (
                <span className="status-pill" key={service}>
                  {service}
                </span>
              ))}
            </div>
            <p className="eyebrow">Modo</p>
            <strong>{caseSheet.mode.label}</strong>
          </section>

          <section className="case-sheet-section">
            <p className="eyebrow">Bloqueos</p>
            {caseSheet.blockers.length > 0 ? (
              <ul className="card-list">
                {caseSheet.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No hay blockers activos en este momento.</p>
            )}
          </section>

          <section className="case-sheet-section">
            <p className="eyebrow">Campos de alto valor</p>
            {caseSheet.highValueMissingFields.length > 0 ? (
              <ul className="card-list">
                {caseSheet.highValueMissingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No hay campos high-value pendientes.</p>
            )}
          </section>

          <section className="case-sheet-section">
            <p className="eyebrow">Supuestos</p>
            {caseSheet.assumptions.length > 0 ? (
              <ul className="card-list">
                {caseSheet.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No hay supuestos internos activos.</p>
            )}
          </section>

          <section className="case-sheet-section">
            <p className="eyebrow">Pendientes</p>
            {caseSheet.pendingItems.length > 0 ? (
              <ul className="card-list">
                {caseSheet.pendingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No hay pendientes abiertos.</p>
            )}
          </section>
        </div>
      </section>

      <OperatorNotesPanel
        initialValue={caseSheet.operatorNote}
        quoteSessionId={record.session.id}
      />
    </section>
  );
}
