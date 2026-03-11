"use client";

export const TransientFailureNotice = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="transient-failure">
    <div className="transient-failure-copy">
      <p className="eyebrow">No se pudo completar la acción</p>
      <p className="muted">{error}</p>
    </div>
    <button className="ghost-button" onClick={onRetry} type="button">
      Reintentar
    </button>
  </div>
);
