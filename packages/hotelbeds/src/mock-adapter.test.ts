import { describe, expect, it } from "vitest";

import type { StructuredIntake } from "@alana/domain";

import { createMockHotelbedsAdapter } from "./index";

const buildIntake = (destination: string): StructuredIntake => ({
  contradictions: [],
  createdAt: "2026-03-09T00:00:00.000Z",
  extractedFields: {
    adults: 2,
    children: 0,
    destination,
    raw: `Need hotel in ${destination}`,
    travelDates: ["2026-05-01", "2026-05-05"],
  },
  id: "intake-1",
  missingFields: [],
  quoteSessionId: "quote-1",
  readinessByServiceLine: {
    hotel: "ready" as const,
  },
  requestedServiceLines: ["hotel"],
});

describe("hotelbeds mock adapter", () => {
  it("returns a no-results error for unsupported destinations", async () => {
    const adapter = createMockHotelbedsAdapter();
    const result = await adapter.search(buildIntake("Smallville"), "hotel");

    expect(result.error?.code).toBe("no_results");
    expect(result.options).toHaveLength(0);
  });

  it("marks Cancun activities as a weak shortlist", async () => {
    const adapter = createMockHotelbedsAdapter();
    const result = await adapter.search(buildIntake("Cancun"), "activity");

    expect(result.weakShortlist).toBe(true);
    expect(result.error?.code).toBe("weak_results");
    expect(result.options).toHaveLength(1);
  });
});
