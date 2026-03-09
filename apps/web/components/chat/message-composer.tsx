"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import type { QuoteSessionState } from "@alana/domain";

export const MessageComposer = ({
  quoteSessionId,
  status,
}: {
  quoteSessionId: string;
  status: QuoteSessionState;
}) => {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);

    await fetch(`/api/quote-sessions/${quoteSessionId}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commandName:
          status === "clarifying"
            ? "submit_clarification_answer"
            : "append_operator_message",
        payload: {
          content,
        },
      }),
    });

    setContent("");
    setIsSubmitting(false);
    router.refresh();
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        onChange={(event) => setContent(event.target.value)}
        placeholder="Paste or write the traveler request. Example: Need hotel and transfer in Madrid from 2026-05-01 to 2026-05-05 for 2 adults."
        rows={4}
        value={content}
      />
      <div className="composer-actions">
        <p className="muted">
          {status === "clarifying"
            ? "This answer will be treated as clarification."
            : "The orchestrator will extract intent, validate blockers and simulate the next node."}
        </p>
        <button
          className="primary-button"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Submitting..." : "Send"}
        </button>
      </div>
    </form>
  );
};
