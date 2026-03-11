import { notFound } from "next/navigation";

import { buildWorkspaceCaseSummary } from "@alana/database";

import { requireOperator } from "@/lib/auth";
import { getQuoteRepository } from "@/lib/repository";

export const getAuthorizedQuoteRecord = async (quoteSessionId: string) => {
  const operator = await requireOperator();
  const repository = await getQuoteRepository();
  const record = await repository.getRecord(quoteSessionId);

  if (!record || record.session.operatorId !== operator.id) {
    notFound();
  }

  return {
    operator,
    record,
    repository,
  };
};

export const getWorkspaceCaseSummaries = async () => {
  const operator = await requireOperator();
  const repository = await getQuoteRepository();
  const sessions = await repository.listSessions(operator.id);
  const records = await Promise.all(
    sessions.map((session) => repository.getRecord(session.id)),
  );

  return records
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .map((record) => buildWorkspaceCaseSummary(record));
};
