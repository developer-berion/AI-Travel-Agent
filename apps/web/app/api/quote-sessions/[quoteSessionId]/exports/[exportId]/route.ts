import { NextResponse } from "next/server";

import { getOperatorFromCookie } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ exportId: string; quoteSessionId: string }> },
) {
  const operator = await getOperatorFromCookie();

  if (!operator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { exportId, quoteSessionId } = await context.params;
  const repository = await getQuoteRepository();
  const record = await repository.getRecord(quoteSessionId);

  if (!record || record.session.operatorId !== operator.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const quoteExport = await repository.getQuoteExport(quoteSessionId, exportId);

  if (!quoteExport) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const exportSnapshot = await repository.getQuoteExportSnapshot(
    quoteSessionId,
    quoteExport.snapshotId,
  );

  if (!exportSnapshot) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    export: quoteExport,
    snapshot: exportSnapshot,
  });
}
