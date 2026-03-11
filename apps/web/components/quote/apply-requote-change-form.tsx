"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { runQuoteCommandRequest } from "@/lib/quote-command-client";

import { TransientFailureNotice } from "./transient-failure-notice";

export const ApplyRequoteChangeForm = ({
  quoteSessionId,
}: {
  quoteSessionId: string;
}) => {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (overrideContent?: string) => {
    const contentToSubmit = overrideContent ?? content;

    if (!contentToSubmit.trim()) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName: "apply_requote_change",
        payload: {
          content: contentToSubmit,
        },
      });

      setContent("");
      router.refresh();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo aplicar el requote.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel-card">
      <div className="panel-card-header">
        <div>
          <p className="eyebrow">Nueva iteración</p>
          <h3>Aplicar un cambio dentro del caso</h3>
        </div>
        <button
          className="secondary-button"
          disabled={isSubmitting}
          onClick={() => {
            void submit();
          }}
          type="button"
        >
          {isSubmitting ? "Actualizando..." : "Aplicar cambio"}
        </button>
      </div>
      <textarea
        className="notes-textarea"
        onChange={(event) => setContent(event.target.value)}
        placeholder="Ejemplo: mantener el hotel actual, pero agregar actividad o cambiar el traslado."
        rows={5}
        value={content}
      />
      {error ? (
        <TransientFailureNotice
          error={error}
          onRetry={() => {
            void submit(content);
          }}
        />
      ) : null}
    </section>
  );
};
