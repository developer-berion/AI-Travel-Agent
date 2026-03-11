"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type CommercialStatus,
  commercialStatusLabels,
  commercialStatusValues,
} from "@alana/domain";

import { runQuoteCommandRequest } from "@/lib/quote-command-client";

import { TransientFailureNotice } from "./transient-failure-notice";

export const CommercialStatusSelect = ({
  quoteSessionId,
  value,
}: {
  quoteSessionId: string;
  value: CommercialStatus;
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

  const submit = async (nextValue: CommercialStatus) => {
    setError(null);
    setLastAttemptValue(nextValue);
    setSelectedValue(nextValue);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName: "update_commercial_status",
        payload: {
          commercialStatus: nextValue,
        },
      });

      router.refresh();
    } catch (commandError) {
      setSelectedValue(value);
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo actualizar el estado comercial.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inline-control-stack">
      <label className="field inline-field">
        <span>Estado comercial</span>
        <select
          className="select-input"
          disabled={isSubmitting}
          onChange={(event) => submit(event.target.value as CommercialStatus)}
          value={selectedValue}
        >
          {commercialStatusValues.map((status) => (
            <option key={status} value={status}>
              {commercialStatusLabels[status]}
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
