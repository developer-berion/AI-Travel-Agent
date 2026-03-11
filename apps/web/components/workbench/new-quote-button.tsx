"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export const NewQuoteButton = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createQuote = async () => {
    setIsCreating(true);

    const response = await fetch("/api/quote-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agencyName: "Alana Tours",
      }),
    });

    const payload = (await response.json()) as { quoteSessionId: string };
    router.push(`/quotes/${payload.quoteSessionId}/conversation`);
    router.refresh();
  };

  return (
    <button
      className="primary-button"
      disabled={isCreating}
      onClick={createQuote}
      type="button"
    >
      {isCreating ? "Creando..." : "Nueva cotización"}
    </button>
  );
};
