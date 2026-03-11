import type { ReactNode } from "react";

import { commercialStatusLabels, getCoverageState } from "@alana/database";

import { CommercialStatusSelect } from "@/components/quote/commercial-status-select";
import { QuoteCommandButton } from "@/components/quote/quote-command-button";
import { RecommendationModeSelect } from "@/components/quote/recommendation-mode-select";
import { QuoteSessionLocalNav } from "@/components/workbench/quote-session-local-nav";
import {
  getContinuityLabel,
  getContinuityVariant,
  getCoverageUiLabel,
  getCoverageUiTone,
  getCurrentActionPresentation,
  quoteStateUiLabels,
  recommendationModeUiLabels,
} from "@/lib/presentation";
import { getAuthorizedQuoteRecord } from "@/lib/quote-session";

export default async function QuoteSessionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ quoteSessionId: string }>;
}) {
  const { quoteSessionId } = await params;
  const { record } = await getAuthorizedQuoteRecord(quoteSessionId);
  const isArchived =
    record.session.status === "archived" ||
    record.session.commercialStatus === "archivada";
  const continuityVariant = getContinuityVariant(record);
  const continuityLabel = getContinuityLabel(record);
  const coverageState = getCoverageState(record);
  const currentAction = getCurrentActionPresentation(record);

  return (
    <div className="session-workbench">
      <section
        className="panel-card workbench-header-card"
        data-variant={continuityVariant}
      >
        <div className="workbench-header-main">
          <div className="panel-card-header">
            <div>
              <p className="eyebrow">Workbench</p>
              <h2>{record.session.tripLabel}</h2>
            </div>
            <div className="card-actions">
              <span
                className="coverage-pill"
                data-tone={getCoverageUiTone(record)}
              >
                {getCoverageUiLabel(record)}
              </span>
              <span className="workbench-badge">{continuityLabel}</span>
              <span className="workbench-badge">
                v{record.session.activeQuoteVersion}
              </span>
            </div>
          </div>

          <p className="lead-copy">{record.session.latestContextSummary}</p>

          <div className="workbench-hero-actions">
            <div className="hero-metrics">
              <div className="hero-metric">
                <span className="hero-kicker">Estado</span>
                <strong>{quoteStateUiLabels[record.session.status]}</strong>
              </div>
              <div className="hero-metric">
                <span className="hero-kicker">Continuidad</span>
                <strong>{continuityLabel}</strong>
              </div>
              <div className="hero-metric">
                <span className="hero-kicker">Comercial</span>
                <strong>
                  {commercialStatusLabels[record.session.commercialStatus]}
                </strong>
              </div>
              <div className="hero-metric">
                <span className="hero-kicker">Modo</span>
                <strong>
                  {
                    recommendationModeUiLabels[
                      record.session.recommendationMode
                    ]
                  }
                </strong>
              </div>
              <div className="hero-metric">
                <span className="hero-kicker">Siguiente paso</span>
                <strong>{currentAction.label}</strong>
              </div>
            </div>

            <div className="card-actions">
              {isArchived ? (
                <QuoteCommandButton
                  commandName="restore_quote_session"
                  label="Reactivar caso"
                  pendingLabel="Reactivando..."
                  quoteSessionId={record.session.id}
                />
              ) : (
                <QuoteCommandButton
                  commandName="archive_quote_session"
                  label="Archivar caso"
                  pendingLabel="Archivando..."
                  quoteSessionId={record.session.id}
                />
              )}
            </div>
          </div>

          <section className="panel-card">
            <div className="panel-card-header">
              <div>
                <p className="eyebrow">Estado operativo</p>
                <h3>{currentAction.label}</h3>
              </div>
              <span
                className="status-pill"
                data-tone={
                  coverageState === "full"
                    ? "success"
                    : coverageState === "partial"
                      ? "warning"
                      : "danger"
                }
              >
                {getCoverageUiLabel(record)}
              </span>
            </div>
            <p className="muted">{currentAction.description}</p>
          </section>

          <div className="toolbar-row">
            <CommercialStatusSelect
              quoteSessionId={record.session.id}
              value={record.session.commercialStatus}
            />
            <RecommendationModeSelect
              quoteSessionId={record.session.id}
              value={record.session.recommendationMode}
            />
          </div>
        </div>
      </section>

      <QuoteSessionLocalNav quoteSessionId={record.session.id} />
      {children}
    </div>
  );
}
