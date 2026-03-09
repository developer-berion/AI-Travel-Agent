import { NextResponse } from "next/server";

import { getOperatorFromCookie } from "@/lib/auth";
import { getQuoteCommandRunner } from "@/lib/orchestrator";
import { getQuoteRepository } from "@/lib/repository";
import { quoteCommandEnvelopeSchema } from "@alana/domain";
import { createId, nowIso } from "@alana/shared";

export async function POST(
  request: Request,
  context: { params: Promise<{ quoteSessionId: string }> },
) {
  const operator = await getOperatorFromCookie();

  if (!operator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { quoteSessionId } = await context.params;
  const payload = (await request.json()) as {
    commandName?: string;
    payload?: Record<string, unknown>;
  };

  const envelope = quoteCommandEnvelopeSchema.parse({
    commandId: createId(),
    commandName: payload.commandName,
    quoteSessionId,
    actor: {
      operatorId: operator.id,
      role: operator.role,
    },
    idempotencyKey: createId(),
    createdAt: nowIso(),
    payload: payload.payload ?? {},
  });

  const repository = await getQuoteRepository();
  const runQuoteCommand = getQuoteCommandRunner();
  const result = await runQuoteCommand(repository, envelope);

  return NextResponse.json(result);
}
