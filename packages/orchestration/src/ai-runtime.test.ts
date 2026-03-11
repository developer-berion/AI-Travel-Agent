import { describe, expect, it } from "vitest";

import { createMockAiRuntime, createStructuredIntake } from "./ai-runtime";

describe("ai runtime", () => {
  it("reuses the Hotelbeds destination registry for accent-safe extraction", async () => {
    const runtime = createMockAiRuntime();

    const extraction = await runtime.extractStructuredIntake({
      content: "Need hotel in París from 2026-06-01 to 2026-06-05 for 2 adults",
      quoteSessionId: "00000000-0000-4000-8000-000000000010",
    });

    expect(extraction.extractedFields.destination).toBe("paris");
    expect(extraction.requestedServiceLines).toEqual(["hotel"]);
    expect(extraction.missingFields).toEqual([]);
  });

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

  it("normalizes stored travel dates when the previous intake kept a combined range string", async () => {
    const runtime = createMockAiRuntime();
    const quoteSessionId = "00000000-0000-4000-8000-000000000099";

    const existingIntake = createStructuredIntake(quoteSessionId, {
      contradictions: [],
      extractedFields: {
        adults: 2,
        childAges: [],
        children: 0,
        destination: "madrid",
        infants: 0,
        raw: "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
        travelDates: ["2026-05-01 to 2026-05-05"],
      },
      missingFields: [],
      previousResponseId: null,
      readinessByServiceLine: {
        hotel: "ready",
      },
      requestedServiceLines: ["hotel"],
    });

    const extraction = await runtime.extractStructuredIntake({
      content: "Also need transfer from Madrid airport to the hotel",
      existingIntake,
      quoteSessionId,
    });

    expect(extraction.extractedFields.travelDates).toEqual([
      "2026-05-01",
      "2026-05-05",
    ]);
    expect(extraction.missingFields).toEqual([]);
  });
});
