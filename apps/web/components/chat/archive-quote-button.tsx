"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export const ArchiveQuoteButton = ({
  quoteSessionId,
}: {
  quoteSessionId: string;
}) => {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  const archive = async () => {
    setIsArchiving(true);

    await fetch(`/api/quote-sessions/${quoteSessionId}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commandName: "archive_quote_session",
        payload: {},
      }),
    });

    router.push("/quotes");
    router.refresh();
  };

  return (
    <button
      className="secondary-button"
      disabled={isArchiving}
      onClick={archive}
      type="button"
    >
      {isArchiving ? "Archiving..." : "Archive"}
    </button>
  );
};
