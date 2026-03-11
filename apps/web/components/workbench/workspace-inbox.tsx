"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";

import {
  type WorkspaceCaseSummary,
  commercialStatusLabels,
  coverageStateLabels,
  quoteStateLabels,
} from "@alana/database";

import { QuoteCommandButton } from "@/components/quote/quote-command-button";
import {
  formatUiDate,
  formatUiDateTime,
  quoteStateUiLabels,
} from "@/lib/presentation";

const groupLabels: Record<WorkspaceCaseSummary["workspaceGroup"], string> = {
  action_required: "Acción requerida",
  archived: "Archivadas",
  closed: "Cerradas",
  follow_up: "En seguimiento",
  shared: "Compartidas",
};

export const WorkspaceInbox = ({
  cases,
}: {
  cases: WorkspaceCaseSummary[];
}) => {
  const [query, setQuery] = useState("");
  const [commercialFilter, setCommercialFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id ?? null);

  const filteredCases = cases.filter((item) => {
    const matchesQuery =
      query.trim().length === 0 ||
      `${item.title} ${item.tripLabel} ${item.requestedServicesLabel}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesCommercial =
      commercialFilter === "all" || item.commercialStatus === commercialFilter;
    const matchesArchive = showArchived || item.workspaceGroup !== "archived";

    return matchesQuery && matchesCommercial && matchesArchive;
  });
  const selectedCase =
    filteredCases.find((item) => item.id === selectedCaseId) ??
    filteredCases[0] ??
    null;
  const groupedCases = Object.entries(groupLabels)
    .map(([group, label]) => ({
      items: filteredCases.filter((item) => item.workspaceGroup === group),
      label,
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="workspace-inbox">
      <div className="panel-card inbox-controls">
        <div>
          <p className="eyebrow">Bandeja operatoria</p>
          <h2>Mis casos activos</h2>
        </div>
        <div className="toolbar-row">
          <label className="field inline-field grow-field">
            <span>Buscar</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Destino, agencia o mix de servicios"
              type="search"
              value={query}
            />
          </label>
          <label className="field inline-field">
            <span>Estado comercial</span>
            <select
              className="select-input"
              onChange={(event) => setCommercialFilter(event.target.value)}
              value={commercialFilter}
            >
              <option value="all">Todos</option>
              {Object.entries(commercialStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle-field">
            <input
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              type="checkbox"
            />
            <span>Mostrar archivadas</span>
          </label>
        </div>
      </div>

      <div className="inbox-grid">
        <div className="inbox-groups">
          {groupedCases.length === 0 ? (
            <div className="empty-panel">
              <p className="eyebrow">Sin resultados</p>
              <h3>No hay casos visibles con los filtros actuales</h3>
              <p className="muted">
                Ajusta la búsqueda o activa las archivadas para ampliar la
                bandeja.
              </p>
            </div>
          ) : (
            groupedCases.map((group) => (
              <section className="panel-card" key={group.label}>
                <div className="panel-card-header">
                  <div>
                    <p className="eyebrow">{group.label}</p>
                    <h3>{group.items.length} caso(s)</h3>
                  </div>
                </div>

                <div className="case-card-list">
                  {group.items.map((item) => (
                    <article
                      className={clsx(
                        "workspace-case-card",
                        selectedCase?.id === item.id && "selected",
                        item.archiveState === "archived" && "archived",
                      )}
                      key={item.id}
                    >
                      <div className="workspace-case-header">
                        <div>
                          <strong>{item.tripLabel}</strong>
                          <p className="muted">{item.title}</p>
                        </div>
                        <span
                          className="status-pill"
                          data-tone={
                            item.coverageState === "full"
                              ? "success"
                              : item.coverageState === "partial"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {coverageStateLabels[item.coverageState]}
                        </span>
                      </div>
                      <div className="workspace-case-meta">
                        <span>{item.requestedServicesLabel}</span>
                        <span>{quoteStateUiLabels[item.status]}</span>
                        <span>
                          {commercialStatusLabels[item.commercialStatus]}
                        </span>
                        <span>v{item.activeQuoteVersion}</span>
                      </div>
                      <p className="muted">{item.summary}</p>
                      <div className="workspace-case-meta">
                        <span>{formatUiDate(item.tripStartDate)}</span>
                        <span>{item.pendingCount} pendientes</span>
                        <span>{item.lastAction}</span>
                      </div>
                      <div className="card-actions">
                        <button
                          className="ghost-button"
                          onClick={() => setSelectedCaseId(item.id)}
                          type="button"
                        >
                          Vista rápida
                        </button>
                        <Link
                          className="primary-button"
                          href={`/quotes/${item.id}/conversation`}
                        >
                          Abrir caso
                        </Link>
                        {item.archiveState === "archived" ? (
                          <QuoteCommandButton
                            commandName="restore_quote_session"
                            label="Reactivar"
                            pendingLabel="Reactivando..."
                            quoteSessionId={item.id}
                          />
                        ) : (
                          <QuoteCommandButton
                            commandName="archive_quote_session"
                            label="Archivar"
                            pendingLabel="Archivando..."
                            quoteSessionId={item.id}
                          />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="preview-column">
          {selectedCase ? (
            <section className="panel-card preview-card">
              <div className="panel-card-header">
                <div>
                  <p className="eyebrow">Vista rápida</p>
                  <h3>{selectedCase.tripLabel}</h3>
                </div>
                <span
                  className="status-pill"
                  data-tone={
                    selectedCase.coverageState === "full"
                      ? "success"
                      : selectedCase.coverageState === "partial"
                        ? "warning"
                        : "danger"
                  }
                >
                  {coverageStateLabels[selectedCase.coverageState]}
                </span>
              </div>
              <p className="muted">{selectedCase.summary}</p>
              <ul className="status-list">
                <li>
                  <span>Servicios</span>
                  <strong>{selectedCase.requestedServicesLabel}</strong>
                </li>
                <li>
                  <span>Estado comercial</span>
                  <strong>
                    {commercialStatusLabels[selectedCase.commercialStatus]}
                  </strong>
                </li>
                <li>
                  <span>Estado del caso</span>
                  <strong>{quoteStateUiLabels[selectedCase.status]}</strong>
                </li>
                <li>
                  <span>Última actividad</span>
                  <strong>
                    {formatUiDateTime(selectedCase.lastActivityAt)}
                  </strong>
                </li>
              </ul>
              <div className="card-actions">
                <Link
                  className="secondary-button"
                  href={`/quotes/${selectedCase.id}/quote`}
                >
                  Revisar propuesta
                </Link>
                <Link
                  className="primary-button"
                  href={`/quotes/${selectedCase.id}/conversation`}
                >
                  Abrir conversación
                </Link>
              </div>
            </section>
          ) : (
            <div className="empty-panel">
              No hay casos visibles con los filtros aplicados.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
