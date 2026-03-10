import { describe, expect, it } from "vitest";

import { createMockQuoteRepository } from "@alana/database";
import { createId, nowIso } from "@alana/shared";

import { promptRegistry, runQuoteCommand } from "./index";

describe("orchestration", () => {
  it("keeps prompt registry versioned", () => {
    expect(promptRegistry.master.version).toBeTruthy();
  });

  it("moves a ready request into reviewing with shortlists", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      operatorId: createId(),
      title: "QA session",
      agencyName: "Alana",
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
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    });

    expect(result.nextAction).toBe("results_ready");
  });
});
