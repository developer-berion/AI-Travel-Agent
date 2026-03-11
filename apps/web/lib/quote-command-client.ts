"use client";

import { normalizeVisibleCommandError } from "@/lib/presentation";

type QuoteCommandResponse = {
  error?: string;
  viewModelDelta?: Record<string, unknown>;
};

export const runQuoteCommandRequest = async (input: {
  quoteSessionId: string;
  commandName: string;
  payload?: Record<string, unknown>;
}) => {
  const response = await fetch(
    `/api/quote-sessions/${input.quoteSessionId}/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commandName: input.commandName,
        payload: input.payload ?? {},
      }),
    },
  );

  const payload = (await response
    .json()
    .catch(() => ({}))) as QuoteCommandResponse;

  if (!response.ok) {
    throw new Error(
      normalizeVisibleCommandError(
        payload.error ?? "No se pudo completar la acción.",
      ),
    );
  }

  return payload;
};
