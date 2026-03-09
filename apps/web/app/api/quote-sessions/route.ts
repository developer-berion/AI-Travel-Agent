import { NextResponse } from "next/server";

import { getOperatorFromCookie } from "@/lib/auth";
import { createSessionTitle, getQuoteRepository } from "@/lib/repository";

export async function GET() {
  const operator = await getOperatorFromCookie();

  if (!operator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const repository = await getQuoteRepository();
  return NextResponse.json({
    sessions: await repository.listSessions(operator.id),
  });
}

export async function POST(request: Request) {
  const operator = await getOperatorFromCookie();

  if (!operator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const repository = await getQuoteRepository();
  const payload = (await request.json()) as {
    agencyName?: string;
  };

  const record = await repository.createSession({
    operatorId: operator.id,
    title: createSessionTitle(payload.agencyName ?? "Alana Tours"),
    agencyName: payload.agencyName ?? "Alana Tours",
  });

  await repository.appendAuditEvent({
    quoteSessionId: record.session.id,
    eventName: "quote_session_created",
    payload: {
      operatorId: operator.id,
    },
  });

  return NextResponse.json({
    quoteSessionId: record.session.id,
  });
}
