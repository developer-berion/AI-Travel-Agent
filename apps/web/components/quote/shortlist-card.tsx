"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { serviceLineUiLabels } from "@/lib/presentation";
import { runQuoteCommandRequest } from "@/lib/quote-command-client";
import { useCompareStore } from "@/state/compare-store";
import type { NormalizedOption } from "@alana/domain";

import { TransientFailureNotice } from "./transient-failure-notice";

export const ShortlistCard = ({
  isSelectedForQuote,
  option,
  quoteSessionId,
}: {
  isSelectedForQuote: boolean;
  option: NormalizedOption;
  quoteSessionId: string;
}) => {
  const router = useRouter();
  const selectedOptionIds = useCompareStore((state) => state.selectedOptionIds);
  const toggleOption = useCompareStore((state) => state.toggleOption);
  const isSelected = selectedOptionIds.includes(option.id);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectForQuote = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName: "select_option_for_cart",
        payload: {
          optionId: option.id,
        },
      });

      router.refresh();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo promover la opcion al quote activo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="shortlist-card">
      <header className="shortlist-header">
        <div>
          <p className="eyebrow">{serviceLineUiLabels[option.serviceLine]}</p>
          <h3>{option.title}</h3>
        </div>
        <strong>
          {option.currency} {option.headlinePrice}
        </strong>
      </header>
      <ul className="card-list">
        <li>{option.whyItFits}</li>
        <li>{option.tradeoff}</li>
        {option.caveat ? <li>{option.caveat}</li> : null}
      </ul>
      <div className="card-actions">
        <button
          className={clsx("secondary-button", isSelected && "selected")}
          onClick={() => toggleOption(option.id, option.serviceLine)}
          type="button"
        >
          {isSelected ? "Incluida en comparativa" : "Agregar a comparativa"}
        </button>
        <button
          className={clsx("ghost-button", isSelectedForQuote && "selected")}
          disabled={isSubmitting}
          onClick={selectForQuote}
          type="button"
        >
          {isSubmitting
            ? "Seleccionando..."
            : isSelectedForQuote
              ? "Ya está en la propuesta"
              : "Seleccionar para propuesta"}
        </button>
      </div>
      {error ? (
        <TransientFailureNotice error={error} onRetry={selectForQuote} />
      ) : null}
    </article>
  );
};
