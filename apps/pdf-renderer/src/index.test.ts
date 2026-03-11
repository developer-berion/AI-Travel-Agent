import { describe, expect, it } from "vitest";

import type { QuoteExportSnapshot } from "@alana/domain";

import { buildQuotePdfFileName, renderQuotePdf } from "./index";

const snapshot: QuoteExportSnapshot = {
  activeQuoteVersion: 3,
  agencyName: "Alana Tours",
  bundleReview: {
    activeQuoteVersion: 3,
    blockers: [],
    currency: "EUR",
    isExportReady: true,
    selectedItems: [],
    totalPrice: 540,
    warnings: ["Taxes payable at check-in."],
  },
  commercialStatus: "compartida",
  confirmedStateSummary: "Bundle confirmed and ready to share with the client.",
  createdAt: "2026-03-10T15:00:00.000Z",
  id: "e5ee5553-e7fd-4c4f-b0ea-0c51ce80ac4f",
  quoteSessionId: "cdb7de51-966f-4f5a-bcc1-3307674e715b",
  recommendationMode: "best_match",
  selectedItems: [
    {
      availabilityState: "available",
      caveat: "Non-refundable rate.",
      currency: "EUR",
      destination: "Madrid",
      headlinePrice: 540,
      id: "6b48c59d-9f86-4e0e-a4be-d5c1093e49d0",
      serviceLine: "hotel",
      supplierMetadata: {
        source: "hotelbeds_hotels",
      },
      title: "Madrid Central Hotel",
      tradeoff: "Breakfast is not included.",
      whyItFits: "Central location for the requested stay.",
    },
  ],
  status: "exported",
  summary: "Quote export v3 for Trip to Madrid",
  title: "Madrid case",
  tripLabel: "Trip to Madrid",
  tripStartDate: "2026-05-01",
};

snapshot.bundleReview.selectedItems = snapshot.selectedItems;

describe("pdf renderer", () => {
  it("renders a binary PDF document for an export snapshot", async () => {
    const pdfBytes = await renderQuotePdf(snapshot);
    const header = new TextDecoder().decode(pdfBytes.subarray(0, 4));

    expect(header).toBe("%PDF");
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("builds a deterministic PDF file name from the trip label", () => {
    expect(buildQuotePdfFileName(snapshot)).toBe("trip-to-madrid-v3.pdf");
  });
});
