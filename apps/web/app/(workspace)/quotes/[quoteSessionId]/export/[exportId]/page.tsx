import { notFound } from "next/navigation";

import { buildActiveQuoteViewFromSnapshot } from "@alana/database";

import { ActiveQuoteReview } from "@/components/quote/active-quote-review";
import { requireOperator } from "@/lib/auth";
import {
  commercialStatusUiLabels,
  formatUiDateTime,
  quoteStateUiLabels,
  recommendationModeUiLabels,
} from "@/lib/presentation";
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

  const activeQuoteView = buildActiveQuoteViewFromSnapshot(exportSnapshot);

  return (
    <section className="workspace-grid single-column">
      <section className="panel-card">
        <div className="thread-actions">
          <div>
            <p className="eyebrow">Exportación</p>
            <h2>{exportSnapshot.tripLabel}</h2>
            <p className="muted">{exportSnapshot.summary}</p>
          </div>
          <div className="card-actions">
            <a className="primary-button" href={pdfPath}>
              Descargar PDF
            </a>
          </div>
        </div>

        <div className="summary-metrics">
          <div>
            <span>Agencia</span>
            <strong>{exportSnapshot.agencyName}</strong>
          </div>
          <div>
            <span>Versión</span>
            <strong>v{quoteExport.activeQuoteVersion}</strong>
          </div>
          <div>
            <span>Generado</span>
            <strong>{formatUiDateTime(quoteExport.createdAt)}</strong>
          </div>
          <div>
            <span>Archivo</span>
            <strong>{quoteExport.fileName}</strong>
          </div>
          <div>
            <span>Tamaño</span>
            <strong>{formatFileSize(quoteExport.fileSizeBytes)}</strong>
          </div>
        </div>

        <p className="muted">
          Este artefacto usa el mismo modelo de propuesta activa, pero congelado
          en la versión exportada para evitar drift visual o comercial.
        </p>
      </section>

      <ActiveQuoteReview quote={activeQuoteView} />

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <p className="eyebrow">Estado congelado</p>
            <h3>Resumen del export</h3>
          </div>
        </div>
        <p className="muted">{exportSnapshot.confirmedStateSummary}</p>
        <ul className="status-list">
          <li>
            <span>Estado al exportar</span>
            <strong>{quoteStateUiLabels[exportSnapshot.status]}</strong>
          </li>
          <li>
            <span>Comercial</span>
            <strong>
              {commercialStatusUiLabels[exportSnapshot.commercialStatus]}
            </strong>
          </li>
          <li>
            <span>Modo</span>
            <strong>
              {recommendationModeUiLabels[exportSnapshot.recommendationMode]}
            </strong>
          </li>
          <li>
            <span>Total</span>
            <strong>
              {exportSnapshot.bundleReview.currency}{" "}
              {exportSnapshot.bundleReview.totalPrice}
            </strong>
          </li>
        </ul>
        {exportSnapshot.bundleReview.warnings.length > 0 ? (
          <p className="eyebrow">Advertencias</p>
        ) : null}
        {exportSnapshot.bundleReview.warnings.length > 0 ? (
          <ul className="card-list">
            {exportSnapshot.bundleReview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <p className="muted">
          El export no cambia por sí solo el estado comercial del caso.
        </p>
      </section>
    </section>
  );
}
