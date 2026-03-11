import type { ActiveQuoteView } from "@alana/database";

import { formatUiDateTime, serviceLineUiLabels } from "@/lib/presentation";

export const ActiveQuoteReview = ({
  quote,
}: {
  quote: ActiveQuoteView;
}) => (
  <section className="active-quote">
    <section className="panel-card quote-header-card">
      <div className="quote-summary-main">
        <div className="panel-card-header">
          <div>
            <p className="eyebrow">Propuesta activa</p>
            <h2>{quote.tripLabel}</h2>
            <p className="muted">{quote.title}</p>
          </div>
          <div className="quote-summary-total">
            <span className="hero-kicker">Cotización total</span>
            <strong className="price-tag">
              {quote.pricingSummary.currency
                ? `${quote.pricingSummary.currency} ${quote.pricingSummary.totalPrice}`
                : "Pendiente"}
            </strong>
          </div>
        </div>
        <div className="quote-meta-grid">
          <div>
            <span>Salida</span>
            <strong>{quote.tripStartDate ?? "Por confirmar"}</strong>
          </div>
          <div>
            <span>Servicios</span>
            <strong>
              {quote.categories.map((category) => category.title).join(" + ") ||
                "Pendiente"}
            </strong>
          </div>
          <div>
            <span>Versión</span>
            <strong>v{quote.versionMetadata.activeQuoteVersion}</strong>
          </div>
          <div>
            <span>Comercial</span>
            <strong>{quote.versionMetadata.commercialStatusLabel}</strong>
          </div>
          <div>
            <span>Modo</span>
            <strong>{quote.versionMetadata.recommendationModeLabel}</strong>
          </div>
          <div>
            <span>Actualizada</span>
            <strong>{formatUiDateTime(quote.versionMetadata.updatedAt)}</strong>
          </div>
        </div>
      </div>
      <p className="lead-copy">{quote.executiveSummary}</p>
    </section>

    <section
      className={`panel-card coverage-banner ${quote.coverageBanner.value}`}
      data-tone={quote.coverageBanner.value === "full" ? "success" : "warning"}
    >
      <p className="eyebrow">Cobertura y caveats</p>
      <h3>{quote.coverageBanner.label}</h3>
      <p className="muted">{quote.coverageBanner.message}</p>
    </section>

    {quote.proposedTravelPlan.length > 0 ? (
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <p className="eyebrow">Paquete propuesto</p>
            <h3>Selección actual</h3>
          </div>
        </div>
        <ul className="card-list">
          {quote.proposedTravelPlan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    ) : null}

    <section className="quote-category-grid">
      {quote.categories.map((category) => (
        <article
          className="panel-card quote-category-card"
          key={category.serviceLine}
        >
          <div className="panel-card-header">
            <div>
              <p className="eyebrow">{category.title}</p>
              <h3>
                {category.selectedItem?.title ?? `${category.title} pendiente`}
              </h3>
            </div>
            <span
              className="status-pill"
              data-tone={category.status === "selected" ? "success" : "warning"}
            >
              {category.status === "selected" ? "Activa" : "Pendiente"}
            </span>
          </div>

          {category.selectedItem ? (
            <>
              <p className="price-tag">
                {category.selectedItem.currency}{" "}
                {category.selectedItem.headlinePrice}
              </p>
              <p>{category.selectedItem.whyItFits}</p>
              <details className="quote-detail-toggle">
                <summary>Detalle operatorio</summary>
                <ul className="card-list">
                  <li>{category.selectedItem.tradeoff}</li>
                  {category.selectedItem.caveat ? (
                    <li>{category.selectedItem.caveat}</li>
                  ) : null}
                  <li>{category.selectedItem.destination}</li>
                </ul>
              </details>
            </>
          ) : (
            <p className="muted">
              {category.pendingReason ?? "Todavía no hay una selección activa."}
            </p>
          )}
        </article>
      ))}
    </section>

    <section className="panel-card pricing-card">
      <div className="panel-card-header">
        <div>
          <p className="eyebrow">Precios y taxes</p>
          <h3>Desglose de servicios</h3>
        </div>
      </div>
      <ul className="status-list">
        {quote.pricingSummary.lineItems.map((item) => (
          <li key={`${item.serviceLine}-${item.title}`}>
            <span>{serviceLineUiLabels[item.serviceLine]}</span>
            <strong>
              {item.title} | {item.currency} {item.amount}
            </strong>
          </li>
        ))}
      </ul>

      <div className="quote-pricing-split">
        <section className="case-sheet-section">
          <p className="eyebrow">Incluido</p>
          <ul className="card-list">
            {quote.includedCharges.map((charge) => (
              <li key={charge}>{charge}</li>
            ))}
          </ul>
        </section>

        <section className="case-sheet-section">
          <p className="eyebrow">No incluido</p>
          {quote.notIncludedCharges.length > 0 ? (
            <ul className="card-list">
              {quote.notIncludedCharges.map((charge) => (
                <li key={charge}>{charge}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No hay exclusiones visibles en la versión activa.
            </p>
          )}
        </section>

        <section className="case-sheet-section">
          <p className="eyebrow">Revisar aparte</p>
          {quote.reviewSeparatelyConditions.length > 0 ? (
            <ul className="card-list">
              {quote.reviewSeparatelyConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No condiciones extra para revisar aparte.</p>
          )}
        </section>
      </div>
    </section>

    {quote.pendingConditions.length > 0 ? (
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <p className="eyebrow">Pendientes visibles</p>
            <h3>Advertencias comerciales</h3>
          </div>
        </div>
        <ul className="card-list">
          {quote.pendingConditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </section>
    ) : null}
  </section>
);
