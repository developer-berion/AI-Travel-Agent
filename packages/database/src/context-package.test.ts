import { describe, expect, it } from "vitest";

import { buildBundleReviewView, buildContextPackage } from "./context-package";
import { createMockQuoteRepository } from "./mock-repository";

describe("database context package", () => {
  it("builds a compact context package from the quote record", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Madrid case",
    });

    const contextPackage = buildContextPackage(record);

    expect(contextPackage.metadata.title).toBe("Madrid case");
    expect(contextPackage.pendingQuestion).toContain("Comparte el pedido");
    expect(contextPackage.selectedItems).toHaveLength(0);
    expect(contextPackage.shortlists).toHaveLength(0);
    expect(contextPackage.bundleReview).toBeNull();
  });

  it("builds bundle review data from selected supplier-backed items", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Madrid case",
    });

    record.shortlists = [
      {
        id: "shortlist-1",
        items: [
          {
            availabilityState: "available",
            caveat: "Taxes not included.",
            currency: "EUR",
            destination: "Madrid",
            headlinePrice: 540,
            id: "option-1",
            serviceLine: "hotel",
            supplierMetadata: {
              source: "hotelbeds_hotels",
            },
            title: "Madrid Central Hotel",
            tradeoff: "Non-refundable rate.",
            whyItFits: "Strong city-center fit.",
          },
        ],
        quoteSessionId: record.session.id,
        reason: null,
        serviceLine: "hotel",
        weakShortlist: false,
      },
    ];
    const selectedOption = record.shortlists[0]?.items[0];

    expect(selectedOption).toBeDefined();
    if (!selectedOption) {
      throw new Error("selected option fixture missing");
    }

    record.selectedItems = [selectedOption];

    const bundleReview = buildBundleReviewView(record);

    expect(bundleReview?.isExportReady).toBe(true);
    expect(bundleReview?.currency).toBe("EUR");
    expect(bundleReview?.totalPrice).toBe(540);
    expect(bundleReview?.warnings).toContain("Taxes not included.");
  });
});
