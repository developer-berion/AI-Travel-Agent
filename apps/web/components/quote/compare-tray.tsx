"use client";

import {
  type CompareAttributeRow,
  buildCompareMatrixView,
} from "@alana/database";
import type { ServiceLine, Shortlist } from "@alana/domain";

import {
  serviceLineUiLabels,
  translateCompareRowLabel,
} from "@/lib/presentation";
import { useCompareStore } from "@/state/compare-store";

import { QuoteCommandButton } from "./quote-command-button";

const CompareRowGroup = ({
  rows,
}: {
  rows: CompareAttributeRow[];
}) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="compare-row-group">
      {rows.map((row) => (
        <div className="compare-row" key={row.id}>
          <div className="compare-row-label">
            <span>{translateCompareRowLabel(row.label)}</span>
          </div>
          {row.values.map((value) => (
            <div
              className="compare-row-value"
              key={`${row.id}-${value.optionId}`}
            >
              {value.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const CompareTray = ({
  activeOptionIds = [],
  quoteSessionId,
  shortlists,
}: {
  activeOptionIds?: string[];
  quoteSessionId: string;
  shortlists: Shortlist[];
}) => {
  const selectedOptionIds = useCompareStore((state) => state.selectedOptionIds);
  const selectedServiceLine = useCompareStore(
    (state) => state.selectedServiceLine,
  );
  const setSelectedServiceLine = useCompareStore(
    (state) => state.setSelectedServiceLine,
  );
  const toggleOption = useCompareStore((state) => state.toggleOption);
  const clear = useCompareStore((state) => state.clear);
  const categories: ServiceLine[] = [
    ...new Set(shortlists.map((shortlist) => shortlist.serviceLine)),
  ];

  if (categories.length === 0) {
    return null;
  }

  const defaultCategory = categories[0];

  if (!defaultCategory) {
    return null;
  }

  const activeCategory = selectedServiceLine ?? defaultCategory;
  const categoryOptions =
    shortlists.find((shortlist) => shortlist.serviceLine === activeCategory)
      ?.items ?? [];
  const selectedOptions = categoryOptions.filter((option) =>
    selectedOptionIds.includes(option.id),
  );
  const compareMatrix = buildCompareMatrixView(
    selectedOptions,
    activeOptionIds,
  );

  return (
    <section className="compare-panel panel-card">
      <div className="compare-panel-header">
        <div>
          <p className="eyebrow">Comparativa</p>
          <h3>Matriz por categoría</h3>
          <p className="muted">
            Máximo 5 opciones. Esta vista sigue siendo operator-only y no
            reemplaza la propuesta compartible.
          </p>
        </div>
        <div className="compare-panel-actions">
          <label className="field inline-field">
            <span>Categoría</span>
            <select
              className="select-input"
              onChange={(event) =>
                setSelectedServiceLine(event.target.value as ServiceLine)
              }
              value={activeCategory}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {serviceLineUiLabels[category]}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button" onClick={clear} type="button">
            Limpiar comparativa
          </button>
        </div>
      </div>

      <div className="chip-row">
        {selectedOptions.length > 0 ? (
          selectedOptions.map((option) => (
            <button
              className="secondary-button selected"
              key={option.id}
              onClick={() => toggleOption(option.id, option.serviceLine)}
              type="button"
            >
              {option.title}
            </button>
          ))
        ) : (
          <span className="status-pill">
            Selecciona hasta 5 opciones de {serviceLineUiLabels[activeCategory]}{" "}
            para poblar la matriz
          </span>
        )}
      </div>

      {compareMatrix ? (
        <div className="compare-matrix">
          <div className="compare-matrix-header">
            <div className="compare-row-label">
              <span>Criterio</span>
            </div>
            {compareMatrix.options.map((option) => (
              <div className="compare-option-column" key={option.id}>
                <div className="compare-option-header">
                  <strong>{option.title}</strong>
                  <span className="price-tag">{option.priceLabel}</span>
                </div>
                {option.isActive ? (
                  <span className="status-pill active-pill">
                    Propuesta activa
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <section className="compare-section">
            <p className="eyebrow">Lo que decide</p>
            <CompareRowGroup rows={compareMatrix.topRows} />
          </section>

          <section className="compare-section">
            <p className="eyebrow">Detalle secundario</p>
            <CompareRowGroup rows={compareMatrix.secondaryRows} />
          </section>

          <div className="compare-row compare-action-row">
            <div className="compare-row-label">
              <span>Acción</span>
            </div>
            {compareMatrix.options.map((option) => (
              <div className="compare-row-value" key={`action-${option.id}`}>
                <QuoteCommandButton
                  className="secondary-button"
                  commandName="replace_cart_item"
                  disabled={option.isActive}
                  label={
                    option.isActive ? "Ya está activa" : "Promover a propuesta"
                  }
                  payload={{
                    optionId: option.id,
                  }}
                  quoteSessionId={quoteSessionId}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-panel compact">
          Selecciona opciones desde la shortlist de{" "}
          {serviceLineUiLabels[activeCategory]} para ver la comparativa lado a
          lado.
        </div>
      )}
    </section>
  );
};
