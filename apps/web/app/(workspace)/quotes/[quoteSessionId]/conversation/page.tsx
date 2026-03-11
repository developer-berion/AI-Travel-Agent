import Link from "next/link";

import {
  buildConversationTimelineView,
  buildResumeSnapshotView,
} from "@alana/database";

import { MessageComposer } from "@/components/chat/message-composer";
import { CompareTray } from "@/components/quote/compare-tray";
import { ShortlistCard } from "@/components/quote/shortlist-card";
import {
  continuityUiLabels,
  formatUiDateTime,
  serviceLineUiLabels,
  translateUiAction,
  translateUiEyebrow,
} from "@/lib/presentation";
import { getAuthorizedQuoteRecord } from "@/lib/quote-session";

const getToneForContinuity = (variant: "active" | "archived" | "follow_up") =>
  variant === "archived"
    ? undefined
    : variant === "follow_up"
      ? "info"
      : "success";

export default async function QuoteConversationPage({
  params,
}: {
  params: Promise<{ quoteSessionId: string }>;
}) {
  const { quoteSessionId } = await params;
  const { record } = await getAuthorizedQuoteRecord(quoteSessionId);
  const timeline = buildConversationTimelineView(record);
  const resumeSnapshot = buildResumeSnapshotView(record);

  return (
    <section className="session-page-grid">
      <section className="conversation-column">
        {resumeSnapshot ? (
          <section
            className="panel-card resume-snapshot"
            data-variant={resumeSnapshot.variant}
          >
            <div className="panel-card-header">
              <div>
                <p className="eyebrow">
                  {translateUiEyebrow("Resume continuity")}
                </p>
                <h3>{resumeSnapshot.title}</h3>
              </div>
              <span
                className="status-pill"
                data-tone={getToneForContinuity(resumeSnapshot.variant)}
              >
                {continuityUiLabels[resumeSnapshot.variant]}
              </span>
            </div>

            <p className="muted">{resumeSnapshot.summary}</p>

            <ul className="status-list">
              <li>
                <span>Versión activa</span>
                <strong>v{resumeSnapshot.activeQuoteVersion}</strong>
              </li>
              <li>
                <span>Estado comercial</span>
                <strong>{resumeSnapshot.commercialStatusLabel}</strong>
              </li>
              <li>
                <span>Última acción</span>
                <strong>{resumeSnapshot.lastAction}</strong>
              </li>
            </ul>

            {resumeSnapshot.pendingItems.length > 0 ? (
              <ul className="card-list">
                {resumeSnapshot.pendingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            <div className="card-actions">
              <Link
                className="secondary-button"
                href={resumeSnapshot.quotePath}
              >
                Ver propuesta activa
              </Link>
              <Link
                className="secondary-button"
                href={resumeSnapshot.versionsPath}
              >
                Abrir historial
              </Link>
            </div>
          </section>
        ) : null}

        {timeline.stateCards.length > 0 ? (
          <section className="state-card-grid">
            {timeline.stateCards.map((card) => (
              <article
                className="panel-card state-card"
                data-tone={card.tone}
                key={card.id}
              >
                <p className="eyebrow">{translateUiEyebrow(card.eyebrow)}</p>
                <h3>{card.title}</h3>
                <p className="muted">{card.body}</p>
                <div className="chip-row">
                  {card.nextActions.map((action) => (
                    <span className="status-pill" key={action}>
                      {translateUiAction(action)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <section className="panel-card">
          <div className="panel-card-header">
            <div>
              <p className="eyebrow">Conversación operatoria</p>
              <h3>{record.session.title}</h3>
              <p className="muted">
                {timeline.collapseTranscript
                  ? "La continuidad del caso queda primero y el transcript completo queda plegado para retomarlo cuando haga falta."
                  : "El hilo mantiene visibles los bloques operativos, los mensajes del operador y el acceso directo a la shortlist actual."}
              </p>
            </div>
          </div>

          {timeline.blocks.length > 0 ? (
            <div className="conversation-block-list">
              {timeline.blocks.map((block) => (
                <article
                  className="conversation-block"
                  data-tone={block.tone}
                  key={block.id}
                >
                  <div className="conversation-meta">
                    <div>
                      <p className="eyebrow">
                        {translateUiEyebrow(block.eyebrow)}
                      </p>
                      <strong>{block.title}</strong>
                    </div>
                  </div>
                  <p className="conversation-text">{block.body}</p>
                  {block.details.length > 0 ? (
                    <ul className="card-list">
                      {block.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                  {block.nextActions.length > 0 ? (
                    <div className="chip-row">
                      {block.nextActions.map((action) => (
                        <span className="status-pill" key={action}>
                          {translateUiAction(action)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel compact">
              Comparte el primer pedido del viajero para iniciar el intake y
              validar readiness.
            </div>
          )}

          <details
            className="transcript-toggle"
            open={!timeline.collapseTranscript}
          >
            <summary>Transcript del operador</summary>
            <div className="message-list rich-message-list">
              {timeline.operatorMessages.length === 0 ? (
                <div className="empty-panel compact">
                  Aún no hay mensajes del operador registrados en este caso.
                </div>
              ) : (
                timeline.operatorMessages.map((message) => (
                  <article className="message-bubble operator" key={message.id}>
                    <span>
                      Mensaje del operador ·{" "}
                      {formatUiDateTime(message.createdAt)}
                    </span>
                    <p>{message.content}</p>
                  </article>
                ))
              )}
            </div>
          </details>

          <MessageComposer
            quoteSessionId={record.session.id}
            status={record.session.status}
          />
        </section>

        {record.shortlists.length > 0 ? (
          <section className="panel-card results-surface">
            <div className="panel-card-header">
              <div>
                <p className="eyebrow">
                  {translateUiEyebrow("Result handoff")}
                </p>
                <h3>Shortlists por categoría</h3>
              </div>
            </div>

            {record.shortlists.map((shortlist) => (
              <div className="shortlist-group" key={shortlist.id}>
                <div className="shortlist-title">
                  <strong>{serviceLineUiLabels[shortlist.serviceLine]}</strong>
                  {shortlist.reason ? <span>{shortlist.reason}</span> : null}
                </div>
                <div className="shortlist-grid">
                  {shortlist.items.map((option) => (
                    <ShortlistCard
                      isSelectedForQuote={record.selectedItems.some(
                        (item) => item.id === option.id,
                      )}
                      key={option.id}
                      option={option}
                      quoteSessionId={record.session.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <CompareTray
          activeOptionIds={record.selectedItems.map((item) => item.id)}
          quoteSessionId={record.session.id}
          shortlists={record.shortlists}
        />
      </section>
    </section>
  );
}
