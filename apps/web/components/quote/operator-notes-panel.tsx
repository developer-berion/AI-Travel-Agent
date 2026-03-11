"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { runQuoteCommandRequest } from "@/lib/quote-command-client";

import { TransientFailureNotice } from "./transient-failure-notice";

export const OperatorNotesPanel = ({
  initialValue,
  quoteSessionId,
}: {
  initialValue: string;
  quoteSessionId: string;
}) => {
  const router = useRouter();
  const [content, setContent] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const save = async (overrideContent?: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName: "save_operator_note",
        payload: {
          content: overrideContent ?? content,
        },
      });

      router.refresh();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudieron guardar las notas.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel-card notes-panel">
      <div className="panel-card-header">
        <div>
          <p className="eyebrow">Notas internas</p>
          <h3>Uso exclusivo del operador</h3>
        </div>
        <button
          className="secondary-button"
          disabled={isSubmitting}
          onClick={() => {
            void save();
          }}
          type="button"
        >
          {isSubmitting ? "Guardando..." : "Guardar notas"}
        </button>
      </div>
      <p className="muted">
        Estas notas viven en el hilo del operador y nunca entran en copy/share o
        export.
      </p>
      <textarea
        className="notes-textarea"
        onChange={(event) => setContent(event.target.value)}
        placeholder="Seguimiento interno, caveats comerciales, pendientes con proveedor..."
        rows={10}
        value={content}
      />
      {error ? (
        <TransientFailureNotice
          error={error}
          onRetry={() => {
            void save(content);
          }}
        />
      ) : null}
    </section>
  );
};
