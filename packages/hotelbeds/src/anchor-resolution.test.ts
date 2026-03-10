import { describe, expect, it } from "vitest";

import type { StructuredIntake } from "@alana/domain";

import { enrichStructuredIntakeWithHotelbedsAnchors } from "./anchor-resolution";

const buildIntake = (
  overrides?: Partial<StructuredIntake>,
  extractedFields?: StructuredIntake["extractedFields"],
): StructuredIntake => ({
  contradictions: [],
  createdAt: "2026-03-10T00:00:00.000Z",
  extractedFields: extractedFields ?? {},
  id: "00000000-0000-4000-8000-000000000001",
  missingFields: [],
  quoteSessionId: "00000000-0000-4000-8000-000000000002",
  readinessByServiceLine: {},
  requestedServiceLines: ["hotel"],
  ...overrides,
});

describe("hotelbeds anchor resolution", () => {
  it("maps hotel and activity destination anchors for supported cities", () => {
    const intake = buildIntake(
      {
        requestedServiceLines: ["hotel", "activity"],
      },
      {
        destination: "Madrid",
        raw: "Need hotel and activities in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
        travelDates: ["2026-05-01", "2026-05-05"],
      },
    );

    const resolved = enrichStructuredIntakeWithHotelbedsAnchors(intake);

    expect(resolved.extractedFields.hotelDestinationCode).toBe("MAD");
    expect(resolved.extractedFields.activityDestinationCode).toBe("MAD");
    expect(resolved.readinessByServiceLine.hotel).toBe("ready");
    expect(resolved.readinessByServiceLine.activity).toBe("ready");
  });

  it("keeps transfer blocked when only the airport side is known", () => {
    const intake = buildIntake(
      {
        requestedServiceLines: ["hotel", "transfer"],
      },
      {
        destination: "Madrid",
        raw: "Need hotel and transfer in Madrid from 2026-05-01 to 2026-05-05 for 2 adults. Airport pickup required.",
        travelDates: ["2026-05-01", "2026-05-05"],
      },
    );

    const resolved = enrichStructuredIntakeWithHotelbedsAnchors(intake);

    expect(resolved.readinessByServiceLine.hotel).toBe("ready");
    expect(resolved.readinessByServiceLine.transfer).toBe("blocked");
    expect(resolved.extractedFields.transferReadinessNote).toBeTypeOf("string");
  });

  it("resolves transfer anchors when airport and property are both explicit", () => {
    const intake = buildIntake(
      {
        requestedServiceLines: ["transfer"],
      },
      {
        destination: "Majorca",
        raw: "Need transfer from Palma airport to HM Jaime III on 2026-05-08 for 2 adults.",
        travelDates: ["2026-05-08", "2026-05-10"],
      },
    );

    const resolved = enrichStructuredIntakeWithHotelbedsAnchors(intake);

    expect(resolved.readinessByServiceLine.transfer).toBe("ready");
    expect(resolved.extractedFields.transferFromCode).toBe("PMI");
    expect(resolved.extractedFields.transferFromType).toBe("IATA");
    expect(resolved.extractedFields.transferToCode).toBe("265");
    expect(resolved.extractedFields.transferToType).toBe("ATLAS");
  });
});
