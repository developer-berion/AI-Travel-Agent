"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { QuoteSessionState } from "@alana/domain";

import { TransientFailureNotice } from "@/components/quote/transient-failure-notice";
import { runQuoteCommandRequest } from "@/lib/quote-command-client";

export const MessageComposer = ({
  quoteSessionId,
  status,
}: {
  quoteSessionId: string;
  status: QuoteSessionState;
}) => {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (
    event?: FormEvent<HTMLFormElement>,
    overrideContent?: string,
  ) => {
    event?.preventDefault();

    const contentToSubmit = overrideContent ?? content;

    if (!contentToSubmit.trim()) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName:
          status === "clarifying"
            ? "submit_clarification_answer"
            : "append_operator_message",
        payload: {
          content: contentToSubmit,
        },
      });

      setContent("");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo enviar el mensaje.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        onChange={(event) => setContent(event.target.value)}
        placeholder="Escribe el pedido del viajero o responde la aclaración visible para continuar."
        rows={3}
        value={content}
      />
      <div className="composer-actions">
        <p className="muted">
          {status === "clarifying"
            ? "Esta respuesta se usará para destrabar el caso y retomar la continuidad."
            : "Alana validará blockers, actualizará el caso y propondrá el siguiente paso visible."}
        </p>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {error ? (
        <TransientFailureNotice
          error={error}
          onRetry={() => {
            void submit(undefined, content);
          }}
        />
      ) : null}
    </form>
  );
};
