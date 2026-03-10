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
});
