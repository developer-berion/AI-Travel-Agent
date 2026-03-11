"use client";

import { useState } from "react";

import { TransientFailureNotice } from "./transient-failure-notice";

export const CopyShareableSummaryButton = ({
  summary,
}: {
  summary: string;
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async () => {
    setError(null);

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setError("No se pudo copiar el resumen shareable.");
    }
  };

  return (
    <div className="action-lane-card">
      <button className="secondary-button" onClick={copy} type="button">
        {copied ? "Resumen copiado" : "Copiar resumen compartible"}
      </button>
      <p className="muted">
        {copied
          ? "Recuerda actualizar el estado comercial si el caso ya fue compartido con el cliente."
          : "Resumen comercial listo para copiar sin notas internas, compare ni metadatos técnicos."}
      </p>
      {error ? <TransientFailureNotice error={error} onRetry={copy} /> : null}
    </div>
  );
};
