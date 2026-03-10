import { describe, expect, it, vi } from "vitest";

import { createMockQuoteRepository } from "@alana/database";
import type { HotelbedsSearchAdapter } from "@alana/hotelbeds";
import { createId, nowIso } from "@alana/shared";

import { createMockAiRuntime } from "./ai-runtime";
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
});
