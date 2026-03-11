"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type RecommendationMode,
  recommendationModeValues,
} from "@alana/domain";

import { recommendationModeUiLabels } from "@/lib/presentation";
import { runQuoteCommandRequest } from "@/lib/quote-command-client";

import { TransientFailureNotice } from "./transient-failure-notice";

export const RecommendationModeSelect = ({
  quoteSessionId,
  value,
}: {
  quoteSessionId: string;
  value: RecommendationMode;
}) => {
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState(value);
  const [lastAttemptValue, setLastAttemptValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedValue(value);
    setLastAttemptValue(value);
  }, [value]);

  const submit = async (nextValue: RecommendationMode) => {
    setError(null);
    setLastAttemptValue(nextValue);
    setSelectedValue(nextValue);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName: "confirm_recommendation_mode",
        payload: {
          recommendationMode: nextValue,
        },
      });

      router.refresh();
    } catch (commandError) {
      setSelectedValue(value);
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo actualizar el recommendation mode.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inline-control-stack">
      <label className="field inline-field">
        <span>Modo de recomendación</span>
        <select
          className="select-input"
          disabled={isSubmitting}
          onChange={(event) => submit(event.target.value as RecommendationMode)}
          value={selectedValue}
        >
          {recommendationModeValues.map((mode) => (
            <option key={mode} value={mode}>
              {recommendationModeUiLabels[mode]}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <TransientFailureNotice
          error={error}
          onRetry={() => {
            void submit(lastAttemptValue);
          }}
        />
      ) : null}
    </div>
  );
};
