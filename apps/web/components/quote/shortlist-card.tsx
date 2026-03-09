"use client";

import clsx from "clsx";

import { useCompareStore } from "@/state/compare-store";
import type { NormalizedOption } from "@alana/domain";

export const ShortlistCard = ({
  option,
}: {
  option: NormalizedOption;
}) => {
  const selectedOptionIds = useCompareStore((state) => state.selectedOptionIds);
  const toggleOption = useCompareStore((state) => state.toggleOption);
  const isSelected = selectedOptionIds.includes(option.id);

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
        <button className="ghost-button" type="button">
          Add to cart
        </button>
      </div>
    </article>
  );
};
