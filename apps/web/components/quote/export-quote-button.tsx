"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

    const response = await fetch(
      `/api/quote-sessions/${quoteSessionId}/commands`,
      {
        body: JSON.stringify({
          commandName: "generate_quote_pdf",
          payload: {},
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    const payload = (await response.json()) as {
      error?: string;
      viewModelDelta?: {
        exportId?: string;
      };
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.viewModelDelta?.exportId) {
      setError(payload.error ?? "No se pudo generar el export.");
      return;
    }

    router.push(
      `/quotes/${quoteSessionId}/export/${payload.viewModelDelta.exportId}`,
    );
    router.refresh();
  };

  return (
    <div className="card-actions">
      <button
        className="primary-button"
        disabled={isSubmitting}
        onClick={generateExport}
        type="button"
      >
        {isSubmitting ? "Generating PDF..." : "Generate PDF export"}
      </button>
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
};
