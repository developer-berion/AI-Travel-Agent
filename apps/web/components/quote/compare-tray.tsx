"use client";

import { useCompareStore } from "@/state/compare-store";
import type { Shortlist } from "@alana/domain";

export const CompareTray = ({
  shortlists,
}: {
  shortlists: Shortlist[];
}) => {
  const selectedOptionIds = useCompareStore((state) => state.selectedOptionIds);
  const clear = useCompareStore((state) => state.clear);
  const options = shortlists.flatMap((shortlist) => shortlist.items);
  const selected = options.filter((option) =>
    selectedOptionIds.includes(option.id),
  );

  if (selected.length === 0) {
    return null;
  }

  return (
    <section className="compare-tray">
      <div className="compare-tray-header">
        <div>
          <p className="eyebrow">Compare tray</p>
          <h3>{selected.length} option(s) selected</h3>
        </div>
        <button className="ghost-button" onClick={clear} type="button">
          Clear
        </button>
      </div>
      <div className="compare-grid">
        {selected.map((option) => (
          <article className="compare-card" key={option.id}>
            <strong>{option.title}</strong>
            <span>
              {option.currency} {option.headlinePrice}
            </span>
            <p>{option.tradeoff}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
