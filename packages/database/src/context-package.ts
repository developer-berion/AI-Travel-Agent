import type {
  AuditEvent,
  ContextPackage,
  QuoteMessage,
  QuoteSession,
  Shortlist,
  StructuredIntake,
} from "@alana/domain";
import { commercialStatusLabels, quoteStateLabels } from "@alana/domain";
import { nowIso } from "@alana/shared";

export type QuoteRecord = {
  session: QuoteSession;
  messages: QuoteMessage[];
  intake: StructuredIntake | null;
  shortlists: Shortlist[];
  auditEvents: AuditEvent[];
};

export type QuoteRepository = {
  createSession(input: {
    operatorId: string;
    title: string;
    agencyName: string;
  }): Promise<QuoteRecord> | QuoteRecord;
  listSessions(operatorId: string): Promise<QuoteSession[]> | QuoteSession[];
  getRecord(
    quoteSessionId: string,
  ): Promise<QuoteRecord | null> | QuoteRecord | null;
  saveRecord(record: QuoteRecord): Promise<QuoteRecord> | QuoteRecord;
  appendMessage(
    message: Omit<QuoteMessage, "id" | "createdAt">,
  ): Promise<QuoteMessage> | QuoteMessage;
  appendAuditEvent(
    event: Omit<AuditEvent, "id" | "createdAt">,
  ): Promise<AuditEvent> | AuditEvent;
};

export const buildContextPackage = (record: QuoteRecord): ContextPackage => ({
  metadata: {
    id: record.session.id,
    title: record.session.title,
    agencyName: record.session.agencyName,
    tripLabel: record.session.tripLabel,
    tripStartDate: record.session.tripStartDate,
    status: record.session.status,
    commercialStatus: record.session.commercialStatus,
    recommendationMode: record.session.recommendationMode,
    activeQuoteVersion: record.session.activeQuoteVersion,
  },
  confirmedStateSummary: record.session.latestContextSummary,
  missingFields: record.intake?.missingFields ?? [],
  pendingQuestion: record.session.pendingQuestion,
  recentMessages: record.messages.slice(-6),
  shortlists: record.shortlists,
});

export const updateSessionMeta = (
  session: QuoteSession,
  input: Partial<
    Pick<
      QuoteSession,
      | "status"
      | "commercialStatus"
      | "pendingQuestion"
      | "tripLabel"
      | "tripStartDate"
      | "latestContextSummary"
      | "activeQuoteVersion"
    >
  >,
): QuoteSession => ({
  ...session,
  ...input,
  updatedAt: nowIso(),
  lastActivityAt: nowIso(),
});

export const createSessionTitle = (agencyName: string) =>
  `${agencyName} quote ${new Date().toLocaleDateString("en-CA")}`;

export { commercialStatusLabels, quoteStateLabels };
