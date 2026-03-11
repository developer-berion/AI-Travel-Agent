"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { runQuoteCommandRequest } from "@/lib/quote-command-client";

import { TransientFailureNotice } from "./transient-failure-notice";

export const ExportQuoteButton = ({
  quoteSessionId,
}: {
  quoteSessionId: string;
}) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateExport = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = (await runQuoteCommandRequest({
        quoteSessionId,
        commandName: "generate_quote_pdf",
      })) as {
        viewModelDelta?: {
          exportId?: string;
        };
      };

      if (!payload.viewModelDelta?.exportId) {
        throw new Error("No se pudo generar el export.");
      }

      router.push(
        `/quotes/${quoteSessionId}/export/${payload.viewModelDelta.exportId}`,
      );
      router.refresh();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo generar el export.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="command-button-stack">
      <button
        className="primary-button"
        disabled={isSubmitting}
        onClick={generateExport}
        type="button"
      >
        {isSubmitting ? "Generando propuesta..." : "Exportar propuesta PDF"}
      </button>
      {error ? (
        <TransientFailureNotice error={error} onRetry={generateExport} />
      ) : null}
    </div>
  );
};
