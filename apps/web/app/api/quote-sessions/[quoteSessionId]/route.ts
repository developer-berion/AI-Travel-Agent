import { NextResponse } from "next/server";

import { getOperatorFromCookie } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ quoteSessionId: string }> },
) {
  const operator = await getOperatorFromCookie();

  if (!operator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { quoteSessionId } = await context.params;
  const repository = await getQuoteRepository();
  const record = await repository.getRecord(quoteSessionId);

  if (!record || record.session.operatorId !== operator.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(record);
}
