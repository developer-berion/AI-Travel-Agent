import { describe, expect, it, vi } from "vitest";

import { createMockQuoteRepository } from "@alana/database";
import type { HotelbedsSearchAdapter } from "@alana/hotelbeds";
import { createId, nowIso } from "@alana/shared";

import { type QuoteAiRuntime, createMockAiRuntime } from "./ai-runtime";
import { createQuoteCommandRunner } from "./quote-command-runner";

describe("quote command runner", () => {
  it("searches only service lines that are supplier-ready", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Supplier-ready session",
      agencyName: "Alana",
    });
    const hotelbedsAdapter: HotelbedsSearchAdapter = {
      search: vi.fn(async (_intake, serviceLine) => ({
        error: null,
        options: [
          {
            availabilityState: "available" as const,
            caveat: null,
            currency: "EUR",
            destination: "Madrid",
            headlinePrice: 540,
            id: createId(),
            serviceLine,
            supplierMetadata: {
              source: "test",
            },
            title: "Madrid supplier-backed option",
            tradeoff: "Requires final supplier validation.",
            whyItFits: "Matches the requested destination and dates.",
          },
        ],
        serviceLine,
        warning: null,
        weakShortlist: false,
      })),
    };
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
      hotelbedsAdapter,
    });

    const result = await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel and transfer in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(hotelbedsAdapter.search).toHaveBeenCalledTimes(1);
    expect(hotelbedsAdapter.search).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedServiceLines: ["hotel", "transfer"],
      }),
      "hotel",
    );
    expect(result.nextAction).toBe("await_clarification_answer");
    expect(storedRecord?.session.status).toBe("clarifying");
    expect(storedRecord?.shortlists).toHaveLength(1);
    expect(storedRecord?.intake?.readinessByServiceLine.transfer).toBe(
      "blocked",
    );
    expect(storedRecord?.session.pendingQuestion).toMatch(/transfer|pickup/i);
  });

  it("selects a shortlist option into bundle review and moves the session to export_ready", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Bundle-ready session",
      agencyName: "Alana",
    });
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const afterSearch = await repository.getRecord(record.session.id);
    const optionId = afterSearch?.shortlists[0]?.items[0]?.id;

    expect(optionId).toBeTruthy();

    const result = await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "select_option_for_cart",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId,
      },
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(result.nextAction).toBe("export_ready");
    expect(storedRecord?.session.status).toBe("export_ready");
    expect(storedRecord?.selectedItems).toHaveLength(1);
    expect(
      storedRecord?.auditEvents.some(
        (event) => event.eventName === "cart_item_selected",
      ),
    ).toBe(true);
  });

  it("removes a selected item and returns the bundle to reviewing", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Bundle-remove session",
      agencyName: "Alana",
    });
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const optionId = (await repository.getRecord(record.session.id))
      ?.shortlists[0]?.items[0]?.id;

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "select_option_for_cart",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId,
      },
    });

    const result = await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "remove_cart_item",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId,
      },
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(result.nextAction).toBe("bundle_blocked");
    expect(storedRecord?.session.status).toBe("reviewing");
    expect(storedRecord?.selectedItems).toHaveLength(0);
    expect(
      storedRecord?.auditEvents.some(
        (event) => event.eventName === "cart_item_removed",
      ),
    ).toBe(true);
  });

  it("uses the selected hotel to unlock transfer search after a partial shortlist", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Transfer after hotel choice",
      agencyName: "Alana",
    });
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel and transfer from Palma airport to the hotel in Majorca from 2026-05-08 to 2026-05-10 for 2 adults",
      },
    });

    const partialRecord = await repository.getRecord(record.session.id);
    const hotelOptionId = partialRecord?.shortlists.find(
      (shortlist) => shortlist.serviceLine === "hotel",
    )?.items[0]?.id;

    expect(partialRecord?.session.status).toBe("clarifying");
    expect(hotelOptionId).toBeTruthy();

    const result = await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "select_option_for_cart",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId: hotelOptionId,
      },
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(result.nextAction).toBe("bundle_blocked");
    expect(storedRecord?.session.status).toBe("reviewing");
    expect(storedRecord?.intake?.readinessByServiceLine.transfer).toBe("ready");
    expect(
      storedRecord?.shortlists.some(
        (shortlist) => shortlist.serviceLine === "transfer",
      ),
    ).toBe(true);
    expect(storedRecord?.selectedItems).toHaveLength(1);
  });

  it("creates a real export snapshot and moves the session to exported", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Export snapshot session",
      agencyName: "Alana",
    });
    const quotePdfRenderer = {
      render: vi.fn(async () =>
        new TextEncoder().encode("%PDF-1.4 mock export"),
      ),
    };
    const quoteExportStorage = {
      storeFile: vi.fn(
        async (input: {
          bytes: Uint8Array;
          exportId: string;
          fileName: string;
          mimeType: string;
          quoteSessionId: string;
        }) => ({
          fileName: input.fileName,
          fileSizeBytes: input.bytes.byteLength,
          mimeType: input.mimeType,
          storageBucket: "quote-exports",
          storagePath: `quote-sessions/${input.quoteSessionId}/exports/${input.exportId}/${input.fileName}`,
        }),
      ),
    };
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
      quoteExportStorage,
      quotePdfRenderer,
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const optionId = (await repository.getRecord(record.session.id))
      ?.shortlists[0]?.items[0]?.id;

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "select_option_for_cart",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId,
      },
    });

    const exportResult = await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "generate_quote_pdf",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {},
    });

    const storedRecord = await repository.getRecord(record.session.id);
    const exportId = exportResult.viewModelDelta.exportId as string | undefined;
    const quoteExport = exportId
      ? await repository.getQuoteExport(record.session.id, exportId)
      : null;
    const exportSnapshot = quoteExport
      ? await repository.getQuoteExportSnapshot(
          record.session.id,
          quoteExport.snapshotId,
        )
      : null;

    expect(exportId).toBeTruthy();
    expect(storedRecord?.session.status).toBe("exported");
    expect(quoteExport?.mimeType).toBe("application/pdf");
    expect(exportSnapshot?.bundleReview.isExportReady).toBe(true);
    expect(exportResult.viewModelDelta.pdfPath).toBe(
      `/api/quote-sessions/${record.session.id}/exports/${exportId}/pdf`,
    );
    expect(quotePdfRenderer.render).toHaveBeenCalledTimes(1);
    expect(quoteExportStorage.storeFile).toHaveBeenCalledTimes(1);
    expect(
      storedRecord?.auditEvents.some(
        (event) => event.eventName === "quote_export_generated",
      ),
    ).toBe(true);
  });

  it("extracts a Supabase-safe trip start date even when the AI runtime returns a combined date range string", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Combined date range session",
      agencyName: "Alana",
    });
    const aiRuntime: QuoteAiRuntime = {
      extractStructuredIntake: vi.fn(async () => ({
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
          hotel: "ready" as const,
        },
        requestedServiceLines: ["hotel" as const],
      })),
    };
    const hotelbedsAdapter: HotelbedsSearchAdapter = {
      search: vi.fn(async (_intake, serviceLine) => ({
        error: null,
        options: [
          {
            availabilityState: "available" as const,
            caveat: null,
            currency: "EUR",
            destination: "Madrid",
            headlinePrice: 540,
            id: createId(),
            serviceLine,
            supplierMetadata: {
              source: "test",
            },
            title: "Madrid supplier-backed option",
            tradeoff: "Requires final supplier validation.",
            whyItFits: "Matches the requested destination and dates.",
          },
        ],
        serviceLine,
        warning: null,
        weakShortlist: false,
      })),
    };
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime,
      hotelbedsAdapter,
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(storedRecord?.session.tripStartDate).toBe("2026-05-01");
  });

  it("saves operator notes and updates the recommendation mode on the active version", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Notes and mode session",
      agencyName: "Alana",
    });
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const optionId = (await repository.getRecord(record.session.id))
      ?.shortlists[0]?.items[0]?.id;

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "select_option_for_cart",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId,
      },
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "save_operator_note",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content: "Internal note for follow-up.",
      },
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "confirm_recommendation_mode",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        recommendationMode: "three_options",
      },
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(storedRecord?.operatorNote?.content).toBe(
      "Internal note for follow-up.",
    );
    expect(storedRecord?.session.recommendationMode).toBe("three_options");
    expect(storedRecord?.quoteVersions[0]?.versionState).toBe("active");
  });

  it("archives and restores a session while keeping continuity state available", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "Archive and restore session",
      agencyName: "Alana",
    });
    const runQuoteCommand = createQuoteCommandRunner({
      aiRuntime: createMockAiRuntime(),
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "append_operator_message",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    const optionId = (await repository.getRecord(record.session.id))
      ?.shortlists[0]?.items[0]?.id;

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "select_option_for_cart",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {
        optionId,
      },
    });

    await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "archive_quote_session",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {},
    });

    const restoreResult = await runQuoteCommand(repository, {
      commandId: createId(),
      commandName: "restore_quote_session",
      quoteSessionId: record.session.id,
      actor: {
        operatorId: record.session.operatorId,
        role: "operator",
      },
      idempotencyKey: createId(),
      createdAt: nowIso(),
      payload: {},
    });

    const storedRecord = await repository.getRecord(record.session.id);

    expect(storedRecord?.session.status).toBe("export_ready");
    expect(storedRecord?.session.commercialStatus).toBe("en_seguimiento");
    expect(restoreResult.viewModelDelta).toHaveProperty("workspaceCase");
    expect(
      storedRecord?.auditEvents.some(
        (event) => event.eventName === "quote_session_restored",
      ),
    ).toBe(true);
  });
});
