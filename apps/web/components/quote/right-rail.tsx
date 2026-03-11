import { type QuoteRecord, buildBundleReviewView } from "@alana/database";
import type { ServiceLine } from "@alana/domain";

import {
  commercialStatusUiLabels,
  quoteStateUiLabels,
  recommendationModeUiLabels,
  serviceLineUiLabels,
} from "@/lib/presentation";

import { ExportQuoteButton } from "./export-quote-button";

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
  const readinessStateLabels = {
    blocked: "Bloqueada",
    ready: "Lista",
  } as const;
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
        <p className="eyebrow">Resumen del caso</p>
        <h3>{record.session.title}</h3>
        <p className="muted">{record.session.latestContextSummary}</p>
      </section>

      <section className="rail-card">
        <p className="eyebrow">Estado</p>
        <ul className="status-list">
          <li>
            <span>Caso</span>
            <strong>{quoteStateUiLabels[record.session.status]}</strong>
          </li>
          <li>
            <span>Comercial</span>
            <strong>
              {commercialStatusUiLabels[record.session.commercialStatus]}
            </strong>
          </li>
          <li>
            <span>Versión activa</span>
            <strong>v{record.session.activeQuoteVersion}</strong>
          </li>
          <li>
            <span>Modo de recomendación</span>
            <strong>
              {recommendationModeUiLabels[record.session.recommendationMode]}
            </strong>
          </li>
        </ul>
      </section>

      <section className="rail-card">
        <p className="eyebrow">Preparación del caso</p>
        {serviceReadiness.length > 0 ? (
          <ul className="card-list">
            {serviceReadiness.map((item) => (
              <li key={item.serviceLine}>
                <strong>
                  {serviceLineUiLabels[item.serviceLine]}:{" "}
                  {readinessStateLabels[
                    item.state as keyof typeof readinessStateLabels
                  ] ?? item.state}
                </strong>
                {item.note ? <p className="muted">{item.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : blockers.length === 0 ? (
          <p className="success-text">No hay bloqueos activos en este caso.</p>
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
          <p className="eyebrow">Revisión del bundle</p>
          <p className="muted">
            {bundleReview.isExportReady
              ? "La selección actual ya puede pasar al siguiente paso de export."
              : "El bundle sigue en revisión y todavía no está listo para export."}
          </p>
          {bundleReview.selectedItems.length > 0 ? (
            <ul className="card-list">
              {bundleReview.selectedItems.map((item) => (
                <li key={item.id}>
                  <strong>
                    {serviceLineUiLabels[item.serviceLine]}: {item.title}
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
              Total del bundle: {bundleReview.currency}{" "}
              {bundleReview.totalPrice}
            </p>
          ) : null}
          {bundleReview.isExportReady ? (
            <ExportQuoteButton quoteSessionId={record.session.id} />
          ) : null}
        </section>
      ) : null}
    </aside>
  );
};
