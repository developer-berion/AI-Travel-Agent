"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCompareStore } from "@/state/compare-store";
import type { NormalizedOption } from "@alana/domain";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectForQuote = async () => {
    setIsSubmitting(true);

    await fetch(`/api/quote-sessions/${quoteSessionId}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commandName: "select_option_for_cart",
        payload: {
          optionId: option.id,
        },
      }),
    });

    setIsSubmitting(false);
    router.refresh();
  };

  return (
    <article className="shortlist-card">
      <header className="shortlist-header">
        <div>
          <p className="eyebrow">{option.serviceLine}</p>
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
          onClick={() => toggleOption(option.id)}
          type="button"
        >
          {isSelected ? "Selected for compare" : "Add to compare"}
        </button>
        <button
          className={clsx("ghost-button", isSelectedForQuote && "selected")}
          disabled={isSubmitting}
          onClick={selectForQuote}
          type="button"
        >
          {isSubmitting
            ? "Selecting..."
            : isSelectedForQuote
              ? "Selected for quote"
              : "Select for quote"}
        </button>
      </div>
    </article>
  );
};
