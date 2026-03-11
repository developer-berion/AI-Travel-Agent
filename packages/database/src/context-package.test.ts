import { describe, expect, it } from "vitest";

import {
  buildActiveQuoteView,
  buildBundleReviewView,
  buildCaseSheetView,
  buildCompareMatrixView,
  buildContextPackage,
  buildConversationTimelineView,
  buildQuoteExportSnapshot,
  buildQuoteVersionDiffView,
  buildResumeSnapshotView,
  buildWorkspaceCaseSummary,
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

  it("builds workspace and case-sheet views from the same quote record", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Case sheet",
    });

    record.intake = {
      contradictions: [],
      createdAt: record.session.createdAt,
      extractedFields: {
        adults: 2,
        destination: "Madrid",
        travelDates: ["2026-06-01", "2026-06-05"],
      },
      id: "intake-3",
      missingFields: ["service_scope"],
      quoteSessionId: record.session.id,
      readinessByServiceLine: {
        hotel: "ready",
      },
      requestedServiceLines: ["hotel"],
    };
    record.operatorNote = {
      content: "Needs faster client follow-up before sharing.",
      createdAt: record.session.createdAt,
      id: "note-1",
      quoteSessionId: record.session.id,
      updatedAt: record.session.updatedAt,
    };

    const workspaceSummary = buildWorkspaceCaseSummary(record);
    const caseSheet = buildCaseSheetView(record);

    expect(workspaceSummary.pendingCount).toBeGreaterThan(0);
    expect(workspaceSummary.coverageState).toBe("not-ready");
    expect(
      caseSheet.confirmedFacts.some((fact) => fact.label === "Destino"),
    ).toBe(true);
    expect(caseSheet.operatorNote).toContain("client follow-up");
  });

  it("builds an active quote review model without leaking operator notes", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Shareable quote",
    });

    record.operatorNote = {
      content: "Internal note only.",
      createdAt: record.session.createdAt,
      id: "note-2",
      quoteSessionId: record.session.id,
      updatedAt: record.session.updatedAt,
    };
    record.intake = {
      contradictions: [],
      createdAt: record.session.createdAt,
      extractedFields: {
        destination: "Madrid",
      },
      id: "intake-4",
      missingFields: [],
      quoteSessionId: record.session.id,
      readinessByServiceLine: {
        hotel: "ready",
      },
      requestedServiceLines: ["hotel"],
    };
    record.selectedItems = [
      {
        availabilityState: "available",
        caveat: "Taxes due at check-in.",
        currency: "EUR",
        destination: "Madrid",
        headlinePrice: 540,
        id: "hotel-quote",
        serviceLine: "hotel",
        supplierMetadata: {
          source: "hotelbeds_hotels",
        },
        title: "Madrid Central Hotel",
        tradeoff: "Non-refundable rate.",
        whyItFits: "Strong city-center fit.",
      },
    ];
    record.shortlists = [
      {
        id: "shortlist-quote",
        items: record.selectedItems,
        quoteSessionId: record.session.id,
        reason: null,
        serviceLine: "hotel",
        weakShortlist: false,
      },
    ];

    const activeQuoteView = buildActiveQuoteView(record);

    expect(activeQuoteView.categories).toHaveLength(1);
    expect(activeQuoteView.shareableSummary).toContain("Madrid Central Hotel");
    expect(activeQuoteView.shareableSummary).not.toContain(
      "Internal note only",
    );
  });

  it("builds a typed conversation timeline and resume snapshot from record state", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Resume timeline case",
    });

    record.messages = [
      {
        content: "Need hotel and transfer in Madrid for 2 adults.",
        createdAt: record.session.createdAt,
        id: "message-1",
        quoteSessionId: record.session.id,
        role: "operator",
      },
    ];
    record.intake = {
      contradictions: ["Pickup y dropoff no coinciden con la ruta pedida."],
      createdAt: record.session.createdAt,
      extractedFields: {
        destination: "Madrid",
        hotelReadinessNote: "Hotel listo para search.",
        transferReadinessNote:
          "Todavia falta pickup exacto para supplier-ready transfer.",
      },
      id: "intake-5",
      missingFields: [],
      quoteSessionId: record.session.id,
      readinessByServiceLine: {
        hotel: "ready",
        transfer: "blocked",
      },
      requestedServiceLines: ["hotel", "transfer"],
    };
    record.auditEvents = [
      {
        createdAt: record.session.updatedAt,
        eventName: "quote_session_restored",
        id: "audit-1",
        payload: {
          restored: true,
        },
        quoteSessionId: record.session.id,
      },
    ];
    record.session.activeQuoteVersion = 3;
    record.session.commercialStatus = "en_seguimiento";
    record.session.latestContextSummary =
      "Caso reactivado. El resumen actual vuelve al frente.";
    record.session.pendingQuestion =
      "Confirma pickup exacto para destrabar transfer.";

    const timeline = buildConversationTimelineView(record);
    const resumeSnapshot = buildResumeSnapshotView(record);

    expect(timeline.blocks.map((block) => block.contractCode)).toContain(
      "M-09",
    );
    expect(timeline.blocks.map((block) => block.contractCode)).toContain(
      "M-07",
    );
    expect(timeline.blocks.map((block) => block.contractCode)).toContain(
      "M-02",
    );
    expect(resumeSnapshot?.variant).toBe("follow_up");
    expect(resumeSnapshot?.pendingItems[0]).toContain("transfer");
  });

  it("splits pricing into included, not included, and review separately buckets", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Pricing split case",
    });

    record.intake = {
      contradictions: [],
      createdAt: record.session.createdAt,
      extractedFields: {
        destination: "Madrid",
      },
      id: "intake-6",
      missingFields: [],
      quoteSessionId: record.session.id,
      readinessByServiceLine: {
        hotel: "ready",
      },
      requestedServiceLines: ["hotel"],
    };
    record.shortlists = [
      {
        id: "shortlist-pricing",
        items: [
          {
            availabilityState: "available",
            caveat: "Taxes due at check-in.",
            currency: "EUR",
            destination: "Madrid",
            headlinePrice: 540,
            id: "hotel-pricing",
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
        reason: "Check cancellation window before sharing.",
        serviceLine: "hotel",
        weakShortlist: true,
      },
    ];
    record.selectedItems = record.shortlists[0]?.items ?? [];

    const activeQuoteView = buildActiveQuoteView(record);

    expect(activeQuoteView.includedCharges[0]).toContain(
      "Madrid Central Hotel",
    );
    expect(activeQuoteView.notIncludedCharges).toContain(
      "Taxes due at check-in.",
    );
    expect(activeQuoteView.reviewSeparatelyConditions).toContain(
      "Check cancellation window before sharing.",
    );
  });

  it("builds compare matrix rows with metadata fallbacks", () => {
    const compareMatrix = buildCompareMatrixView([
      {
        availabilityState: "available",
        caveat: null,
        currency: "USD",
        destination: "Madrid",
        headlinePrice: 120,
        id: "activity-1",
        serviceLine: "activity",
        supplierMetadata: {
          timing: "09:00",
        },
        title: "Madrid walking tour",
        tradeoff: "Limited slots.",
        whyItFits: "Strong city fit.",
      },
      {
        availabilityState: "partial",
        caveat: "Requires reconfirmation.",
        currency: "USD",
        destination: "Madrid",
        headlinePrice: 150,
        id: "activity-2",
        serviceLine: "activity",
        supplierMetadata: {},
        title: "Madrid museum pass",
        tradeoff: "Needs manual slot confirmation.",
        whyItFits: "Good cultural coverage.",
      },
    ]);

    expect(compareMatrix?.serviceLine).toBe("activity");
    expect(compareMatrix?.topRows[0]?.values).toHaveLength(2);
    expect(
      compareMatrix?.secondaryRows.some((row) => row.label === "Timing"),
    ).toBe(true);
    expect(
      compareMatrix?.secondaryRows
        .find((row) => row.label === "Timing")
        ?.values.some((value) => value.value === "—"),
    ).toBe(true);
  });

  it("builds version diffs against the active version", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Version diff case",
    });

    record.quoteVersions = [
      {
        changeReason: "Current active version",
        coverageState: "partial",
        createdAt: record.session.createdAt,
        diffSummary: "Transfer replaced and commercial state updated.",
        id: "version-active",
        payload: {
          commercialStatus: "en_seguimiento",
          recommendationMode: "three_options",
          selectedItems: [
            {
              availabilityState: "available",
              caveat: null,
              currency: "USD",
              destination: "Madrid",
              headlinePrice: 800,
              id: "hotel-2",
              serviceLine: "hotel",
              supplierMetadata: {},
              title: "Hotel Madrid Grand",
              tradeoff: "Higher rate.",
              whyItFits: "Best fit.",
            },
            {
              availabilityState: "available",
              caveat: null,
              currency: "USD",
              destination: "Madrid",
              headlinePrice: 95,
              id: "transfer-2",
              serviceLine: "transfer",
              supplierMetadata: {},
              title: "Private Madrid transfer",
              tradeoff: "Higher cost.",
              whyItFits: "Door-to-door.",
            },
          ],
        },
        quoteSessionId: record.session.id,
        updatedAt: record.session.updatedAt,
        versionNumber: 2,
        versionState: "active",
      },
      {
        changeReason: "Initial version",
        coverageState: "full",
        createdAt: record.session.createdAt,
        diffSummary: "Hotel-only quote.",
        id: "version-old",
        payload: {
          commercialStatus: "abierta",
          recommendationMode: "best_match",
          selectedItems: [
            {
              availabilityState: "available",
              caveat: null,
              currency: "USD",
              destination: "Madrid",
              headlinePrice: 620,
              id: "hotel-1",
              serviceLine: "hotel",
              supplierMetadata: {},
              title: "Hotel Madrid Value",
              tradeoff: "Less flexible.",
              whyItFits: "Better value.",
            },
          ],
        },
        quoteSessionId: record.session.id,
        updatedAt: record.session.updatedAt,
        versionNumber: 1,
        versionState: "superseded",
      },
    ];

    const diff = buildQuoteVersionDiffView(record, "version-old");

    expect(diff?.categoriesAdded).toEqual([
      {
        serviceLine: "transfer",
        title: "Private Madrid transfer",
      },
    ]);
    expect(diff?.categoriesReplaced).toEqual([
      {
        fromTitle: "Hotel Madrid Value",
        serviceLine: "hotel",
        toTitle: "Hotel Madrid Grand",
      },
    ]);
    expect(diff?.recommendationModeChange).toEqual({
      from: "best_match",
      to: "three_options",
    });
    expect(diff?.commercialStatusChange).toEqual({
      from: "abierta",
      to: "en_seguimiento",
    });
  });
});
