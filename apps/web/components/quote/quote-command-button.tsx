"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { runQuoteCommandRequest } from "@/lib/quote-command-client";

import { TransientFailureNotice } from "./transient-failure-notice";

type QuoteCommandButtonProps = {
  className?: string;
  commandName: string;
  disabled?: boolean;
  label: string;
  payload?: Record<string, unknown>;
  pendingLabel?: string;
  quoteSessionId: string;
  redirectTo?: string;
};

export const QuoteCommandButton = ({
  className = "secondary-button",
  commandName,
  disabled,
  label,
  payload = {},
  pendingLabel,
  quoteSessionId,
  redirectTo,
}: QuoteCommandButtonProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runCommand = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await runQuoteCommandRequest({
        quoteSessionId,
        commandName,
        payload,
      });

      if (redirectTo) {
        router.push(redirectTo);
      }

      router.refresh();
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "No se pudo completar la acción.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="command-button-stack">
      <button
        className={className}
        disabled={disabled || isSubmitting}
        onClick={runCommand}
        type="button"
      >
        {isSubmitting ? (pendingLabel ?? label) : label}
      </button>
      {error ? (
        <TransientFailureNotice error={error} onRetry={runCommand} />
      ) : null}
    </div>
  );
};
