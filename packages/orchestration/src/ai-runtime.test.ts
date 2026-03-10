import { describe, expect, it } from "vitest";

import { createMockAiRuntime, createStructuredIntake } from "./ai-runtime";

describe("ai runtime", () => {
  it("merges clarification answers with the previously extracted intake", async () => {
    const runtime = createMockAiRuntime();
    const quoteSessionId = "00000000-0000-4000-8000-000000000001";

    const initialExtraction = await runtime.extractStructuredIntake({
      content:
        "Need hotel in Majorca from 2026-05-08 to 2026-05-10 for 2 adults 1 child ages 5",
      quoteSessionId,
    });
    const existingIntake = createStructuredIntake(
      quoteSessionId,
      initialExtraction,
    );

    const clarificationExtraction = await runtime.extractStructuredIntake({
      content: "Also need transfer from Palma airport to HM Jaime III",
      existingIntake,
      quoteSessionId,
    });

    expect(clarificationExtraction.requestedServiceLines).toEqual([
      "hotel",
      "transfer",
    ]);
    expect(clarificationExtraction.extractedFields.destination).toBe("majorca");
    expect(clarificationExtraction.extractedFields.travelDates).toEqual([
      "2026-05-08",
      "2026-05-10",
    ]);
    expect(clarificationExtraction.extractedFields.children).toBe(1);
    expect(clarificationExtraction.extractedFields.childAges).toEqual(["5"]);
    expect(clarificationExtraction.missingFields).toEqual([]);
  });
});
