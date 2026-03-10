import type {
  AuditEvent,
  BundleReviewView,
  ContextPackage,
  NormalizedOption,
  QuoteExport,
  QuoteExportSnapshot,
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
  selectedItems: NormalizedOption[];
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
  createQuoteExportSnapshot(
    snapshot: Omit<QuoteExportSnapshot, "createdAt" | "id">,
  ): Promise<QuoteExportSnapshot> | QuoteExportSnapshot;
  createQuoteExport(
    quoteExport: Omit<QuoteExport, "createdAt">,
  ): Promise<QuoteExport> | QuoteExport;
  getQuoteExport(
    quoteSessionId: string,
    exportId: string,
  ): Promise<QuoteExport | null> | QuoteExport | null;
  getQuoteExportSnapshot(
    quoteSessionId: string,
    snapshotId: string,
  ): Promise<QuoteExportSnapshot | null> | QuoteExportSnapshot | null;
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
  selectedItems: record.selectedItems,
  shortlists: record.shortlists,
  bundleReview: buildBundleReviewView(record),
});

const buildBundleWarnings = (
  record: QuoteRecord,
  selectedItems: NormalizedOption[],
) => {
  const warnings = new Set<string>();

  for (const shortlist of record.shortlists) {
    if (shortlist.weakShortlist) {
      warnings.add(
        shortlist.reason ??
          `${shortlist.serviceLine} devolvio una shortlist debil y requiere caveats visibles.`,
      );
    }
  }

  for (const item of selectedItems) {
    if (item.caveat) {
      warnings.add(item.caveat);
    }
  }

  return [...warnings];
};

const getServiceLineBundleBlocker = (
  record: QuoteRecord,
  serviceLine: string,
): string => {
  const shortlist = record.shortlists.find(
    (candidate) => candidate.serviceLine === serviceLine,
  );

  if (shortlist && shortlist.items.length === 0 && shortlist.reason) {
    return shortlist.reason;
  }

  const readinessNote =
    record.intake?.extractedFields?.[`${serviceLine}ReadinessNote`];
  const normalizedServiceLine = serviceLine;

  if (typeof readinessNote === "string" && readinessNote.trim().length > 0) {
    return readinessNote.trim();
  }

  return `Selecciona una opcion de ${normalizedServiceLine} para cerrar el bundle.`;
};

export const buildBundleReviewView = (
  record: QuoteRecord,
): BundleReviewView | null => {
  const selectedItems = record.selectedItems;
  const requestedServiceLines = record.intake?.requestedServiceLines ?? [];
  const shortlistServiceLines = [
    ...new Set(record.shortlists.map((shortlist) => shortlist.serviceLine)),
  ];
  const bundleServiceLines = [
    ...new Set([...requestedServiceLines, ...shortlistServiceLines]),
  ];

  if (bundleServiceLines.length === 0 && selectedItems.length === 0) {
    return null;
  }

  const blockers: string[] = [];

  for (const serviceLine of bundleServiceLines) {
    if (!selectedItems.some((item) => item.serviceLine === serviceLine)) {
      blockers.push(getServiceLineBundleBlocker(record, serviceLine));
    }
  }

  const currencies = [...new Set(selectedItems.map((item) => item.currency))];

  if (currencies.length > 1) {
    blockers.push(
      "El bundle mezcla monedas distintas y no esta listo para export.",
    );
  }

  const totalPrice =
    currencies.length <= 1
      ? selectedItems.reduce((sum, item) => sum + item.headlinePrice, 0)
      : 0;

  return {
    isExportReady: blockers.length === 0 && selectedItems.length > 0,
    blockers,
    warnings: buildBundleWarnings(record, selectedItems),
    selectedItems,
    totalPrice,
    currency: currencies[0] ?? "",
    activeQuoteVersion: record.session.activeQuoteVersion,
  };
};

export const buildQuoteExportSnapshot = (
  record: QuoteRecord,
): Omit<QuoteExportSnapshot, "createdAt" | "id"> | null => {
  const bundleReview = buildBundleReviewView(record);

  if (!bundleReview?.isExportReady) {
    return null;
  }

  return {
    activeQuoteVersion: record.session.activeQuoteVersion,
    agencyName: record.session.agencyName,
    bundleReview,
    commercialStatus: record.session.commercialStatus,
    confirmedStateSummary: record.session.latestContextSummary,
    quoteSessionId: record.session.id,
    recommendationMode: record.session.recommendationMode,
    selectedItems: bundleReview.selectedItems,
    status: record.session.status,
    summary: `Quote export v${record.session.activeQuoteVersion} for ${record.session.tripLabel}`,
    title: record.session.title,
    tripLabel: record.session.tripLabel,
    tripStartDate: record.session.tripStartDate,
  };
};

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
