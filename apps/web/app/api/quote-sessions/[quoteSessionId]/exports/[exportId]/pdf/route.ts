import { NextResponse } from "next/server";

import { getOperatorFromCookie } from "@/lib/auth";
import { getQuoteExportStorage } from "@/lib/quote-export-storage";
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

  const storage = getQuoteExportStorage();
  const fileBytes = await storage.readFile(quoteExport);

  if (!fileBytes) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const bodyBytes = new Uint8Array(fileBytes.byteLength);
  bodyBytes.set(fileBytes);
  const body = new Blob([bodyBytes], {
    type: quoteExport.mimeType,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${quoteExport.fileName}"`,
      "Content-Length": String(fileBytes.byteLength),
      "Content-Type": quoteExport.mimeType,
    },
  });
}
