import { describe, expect, it } from "vitest";

import {
  buildBundleReviewView,
  buildContextPackage,
  buildQuoteExportSnapshot,
} from "./context-package";
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

  it("keeps the bundle blocked when a requested service line is still unresolved", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Majorca combo",
    });

    record.intake = {
      contradictions: [],
      createdAt: record.session.createdAt,
      extractedFields: {
        hotelReadinessNote: "Hotel destination mapped to PMI for Majorca.",
        transferReadinessNote:
          "Transfer search has the airport anchor but still needs an exact pickup or dropoff property.",
      },
      id: "intake-1",
      missingFields: [],
      quoteSessionId: record.session.id,
      readinessByServiceLine: {
        hotel: "ready",
        transfer: "blocked",
      },
      requestedServiceLines: ["hotel", "transfer"],
    };
    record.shortlists = [
      {
        id: "shortlist-1",
        items: [
          {
            availabilityState: "available",
            caveat: null,
            currency: "EUR",
            destination: "Majorca",
            headlinePrice: 540,
            id: "option-1",
            serviceLine: "hotel",
            supplierMetadata: {
              source: "hotelbeds_hotels",
            },
            title: "HM Jaime III",
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
    const selectedHotel = record.shortlists[0]?.items[0];

    expect(selectedHotel).toBeDefined();
    if (!selectedHotel) {
      throw new Error("selected hotel fixture missing");
    }

    record.selectedItems = [selectedHotel];

    const bundleReview = buildBundleReviewView(record);

    expect(bundleReview?.isExportReady).toBe(false);
    expect(bundleReview?.blockers).toContain(
      "Transfer search has the airport anchor but still needs an exact pickup or dropoff property.",
    );
  });

  it("builds a real export snapshot when the bundle is export-ready", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Madrid case",
    });

    record.intake = {
      contradictions: [],
      createdAt: record.session.createdAt,
      extractedFields: {},
      id: "intake-2",
      missingFields: [],
      quoteSessionId: record.session.id,
      readinessByServiceLine: {
        hotel: "ready",
      },
      requestedServiceLines: ["hotel"],
    };
    record.shortlists = [
      {
        id: "shortlist-2",
        items: [
          {
            availabilityState: "available",
            caveat: null,
            currency: "EUR",
            destination: "Madrid",
            headlinePrice: 540,
            id: "option-2",
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
    const selectedHotel = record.shortlists[0]?.items[0];

    expect(selectedHotel).toBeDefined();
    if (!selectedHotel) {
      throw new Error("selected hotel fixture missing");
    }

    record.selectedItems = [selectedHotel];

    const exportSnapshot = buildQuoteExportSnapshot(record);

    expect(exportSnapshot?.summary).toContain("Quote export");
    expect(exportSnapshot?.selectedItems).toHaveLength(1);
    expect(exportSnapshot?.bundleReview.isExportReady).toBe(true);
  });

  it("persists a quote export record separately from the frozen snapshot", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Madrid export",
    });

    const exportSnapshot = await repository.createQuoteExportSnapshot({
      activeQuoteVersion: 2,
      agencyName: "Alana Tours",
      bundleReview: {
        activeQuoteVersion: 2,
        blockers: [],
        currency: "EUR",
        isExportReady: true,
        selectedItems: [],
        totalPrice: 540,
        warnings: [],
      },
      commercialStatus: "compartida",
      confirmedStateSummary: "Bundle confirmed.",
      quoteSessionId: record.session.id,
      recommendationMode: "best_match",
      selectedItems: [],
      status: "exported",
      summary: "Quote export v2 for Trip to Madrid",
      title: "Madrid export",
      tripLabel: "Trip to Madrid",
      tripStartDate: "2026-05-01",
    });
    const quoteExport = await repository.createQuoteExport({
      activeQuoteVersion: 2,
      fileName: "trip-to-madrid-v2.pdf",
      fileSizeBytes: 2048,
      id: "4d9b97cf-4ef9-4b0a-a95c-3e72ae0ad724",
      mimeType: "application/pdf",
      quoteSessionId: record.session.id,
      snapshotId: exportSnapshot.id,
      storageBucket: "quote-exports",
      storagePath:
        "quote-sessions/session-1/exports/export-1/trip-to-madrid-v2.pdf",
    });

    const storedQuoteExport = await repository.getQuoteExport(
      record.session.id,
      quoteExport.id,
    );

    expect(storedQuoteExport?.snapshotId).toBe(exportSnapshot.id);
    expect(storedQuoteExport?.fileName).toBe("trip-to-madrid-v2.pdf");
    expect(storedQuoteExport?.storageBucket).toBe("quote-exports");
  });
});
