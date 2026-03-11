"use client";

import clsx from "clsx";
import { useState } from "react";

import {
  type QuoteVersionDiffView,
  type QuoteVersionSummary,
  coverageStateLabels,
} from "@alana/database";
import type {
  CommercialStatus,
  NormalizedOption,
  QuoteVersion,
  RecommendationMode,
} from "@alana/domain";

import {
  commercialStatusUiLabels,
  formatUiDateTime,
  recommendationModeUiLabels,
  serviceLineUiLabels,
} from "@/lib/presentation";

import { QuoteCommandButton } from "./quote-command-button";

const versionStateLabels = {
  active: "Activa",
  superseded: "Histórica",
} as const;

const getSelectedItems = (version: QuoteVersion) =>
  Array.isArray(version.payload.selectedItems)
    ? (version.payload.selectedItems as NormalizedOption[])
    : [];

const getPayloadSummary = (version: QuoteVersion) =>
  typeof version.payload.confirmedStateSummary === "string" &&
  version.payload.confirmedStateSummary.trim().length > 0
    ? version.payload.confirmedStateSummary
    : "Esta versión no guardó un resumen operativo adicional.";

const getPayloadRecommendationMode = (version: QuoteVersion) =>
  typeof version.payload.recommendationMode === "string"
    ? (recommendationModeUiLabels[
        version.payload.recommendationMode as RecommendationMode
      ] ?? "Sin dato")
    : "Sin dato";

const getPayloadCommercialStatus = (version: QuoteVersion) =>
  typeof version.payload.commercialStatus === "string"
    ? (commercialStatusUiLabels[
        version.payload.commercialStatus as CommercialStatus
      ] ?? "Sin dato")
    : "Sin dato";

const buildDeltaItems = (diff: QuoteVersionDiffView | null) => {
  if (!diff) {
    return [];
  }

  return [
    ...diff.categoriesAdded.map((change) => ({
      id: `added-${change.serviceLine}`,
      label: `${serviceLineUiLabels[change.serviceLine]} añadida`,
      value: `La propuesta activa añadió ${change.title}.`,
    })),
    ...diff.categoriesRemoved.map((change) => ({
      id: `removed-${change.serviceLine}`,
      label: `${serviceLineUiLabels[change.serviceLine]} retirada`,
      value: `La propuesta activa ya no incluye ${change.title}.`,
    })),
    ...diff.categoriesReplaced.map((change) => ({
      id: `replaced-${change.serviceLine}`,
      label: `${serviceLineUiLabels[change.serviceLine]} reemplazada`,
      value: `${change.fromTitle} pasó a ${change.toTitle}.`,
    })),
    ...(diff.coverageStateChange
      ? [
          {
            id: "coverage-change",
            label: "Cobertura",
            value: `${coverageStateLabels[diff.coverageStateChange.from]} a ${coverageStateLabels[diff.coverageStateChange.to]}.`,
          },
        ]
      : []),
    ...(diff.recommendationModeChange
      ? [
          {
            id: "mode-change",
            label: "Modo de recomendación",
            value: `${recommendationModeUiLabels[diff.recommendationModeChange.from]} a ${recommendationModeUiLabels[diff.recommendationModeChange.to]}.`,
          },
        ]
      : []),
    ...(diff.commercialStatusChange
      ? [
          {
            id: "commercial-change",
            label: "Estado comercial",
            value: `${commercialStatusUiLabels[diff.commercialStatusChange.from]} a ${commercialStatusUiLabels[diff.commercialStatusChange.to]}.`,
          },
        ]
      : []),
  ];
};

export const QuoteVersionsPanel = ({
  quoteSessionId,
  versionDetails,
  versionDiffs,
  versionSummaries,
}: {
  quoteSessionId: string;
  versionDetails: QuoteVersion[];
  versionDiffs: Array<{
    versionId: string;
    diff: QuoteVersionDiffView;
  }>;
  versionSummaries: QuoteVersionSummary[];
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState(
    versionSummaries[0]?.id ?? null,
  );
  const selectedVersion =
    versionDetails.find((version) => version.id === selectedVersionId) ??
    versionDetails[0] ??
    null;
  const selectedDiff =
    versionDiffs.find((entry) => entry.versionId === selectedVersion?.id)
      ?.diff ?? null;
  const deltaItems = buildDeltaItems(selectedDiff);

  return (
    <div className="versions-grid">
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <p className="eyebrow">Versiones</p>
            <h3>Historial de propuestas</h3>
          </div>
        </div>
        <div className="version-list">
          {versionSummaries.map((version) => (
            <button
              className={clsx(
                "version-list-item",
                selectedVersion?.id === version.id && "selected",
              )}
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              type="button"
            >
              <div className="workspace-case-header">
                <strong>v{version.versionNumber}</strong>
                <span
                  className="status-pill"
                  data-tone={
                    version.versionState === "active" ? "success" : undefined
                  }
                >
                  {versionStateLabels[version.versionState]}
                </span>
              </div>
              <div className="workspace-case-meta">
                <span>{coverageStateLabels[version.coverageState]}</span>
                <span>{formatUiDateTime(version.createdAt)}</span>
              </div>
              <p>{version.changeReason}</p>
              {version.diffSummary ? (
                <p className="muted">{version.diffSummary}</p>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        {selectedVersion ? (
          <>
            <div className="panel-card-header">
              <div>
                <p className="eyebrow">Detalle</p>
                <h3>Versión v{selectedVersion.versionNumber}</h3>
              </div>
              {selectedVersion.versionState === "active" ? (
                <span className="status-pill" data-tone="success">
                  Versión activa
                </span>
              ) : (
                <QuoteCommandButton
                  commandName="apply_requote_change"
                  label="Usar como base"
                  payload={{ versionId: selectedVersion.id }}
                  pendingLabel="Aplicando..."
                  quoteSessionId={quoteSessionId}
                />
              )}
            </div>

            <ul className="status-list">
              <li>
                <span>Cobertura</span>
                <strong>
                  {coverageStateLabels[selectedVersion.coverageState]}
                </strong>
              </li>
              <li>
                <span>Motivo del cambio</span>
                <strong>{selectedVersion.changeReason}</strong>
              </li>
              <li>
                <span>Modo de recomendación</span>
                <strong>{getPayloadRecommendationMode(selectedVersion)}</strong>
              </li>
              <li>
                <span>Estado comercial</span>
                <strong>{getPayloadCommercialStatus(selectedVersion)}</strong>
              </li>
            </ul>

            <section className="case-sheet-section">
              <p className="eyebrow">Snapshot de la versión</p>
              <p className="muted">{getPayloadSummary(selectedVersion)}</p>
              {getSelectedItems(selectedVersion).length > 0 ? (
                <div className="shortlist-grid">
                  {getSelectedItems(selectedVersion).map((item) => (
                    <article className="shortlist-card" key={item.id}>
                      <header className="shortlist-header">
                        <div>
                          <p className="eyebrow">
                            {serviceLineUiLabels[item.serviceLine]}
                          </p>
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
              ) : (
                <p className="muted">
                  Esta versión no dejó una selección cerrada por categoría.
                </p>
              )}
            </section>

            <section className="case-sheet-section">
              <p className="eyebrow">Cambios frente a la activa</p>
              {deltaItems.length > 0 ? (
                <div className="version-delta-list">
                  {deltaItems.map((item) => (
                    <article className="version-delta-item" key={item.id}>
                      <strong>{item.label}</strong>
                      <p className="muted">{item.value}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {selectedVersion.versionState === "active"
                    ? "Esta es la versión activa, así que no necesita diff contra sí misma."
                    : "No hay cambios estructurados adicionales frente a la versión activa."}
                </p>
              )}
            </section>
          </>
        ) : (
          <div className="empty-panel">Aún no hay historial de versiones.</div>
        )}
      </section>
    </div>
  );
};
