import type {
  AuditEvent,
  BundleReviewView,
  ContextPackage,
  CoverageState,
  NormalizedOption,
  OperatorNote,
  QuoteExport,
  QuoteExportSnapshot,
  QuoteMessage,
  QuoteSession,
  QuoteVersion,
  RecommendationMode,
  ServiceLine,
  Shortlist,
  StructuredIntake,
} from "@alana/domain";
import {
  commercialStatusLabels,
  coverageStateLabels,
  quoteStateLabels,
  recommendationModeLabels,
} from "@alana/domain";
import { nowIso } from "@alana/shared";

export type QuoteRecord = {
  session: QuoteSession;
  messages: QuoteMessage[];
  intake: StructuredIntake | null;
  selectedItems: NormalizedOption[];
  shortlists: Shortlist[];
  auditEvents: AuditEvent[];
  operatorNote: OperatorNote | null;
  quoteVersions: QuoteVersion[];
};

export type WorkspaceCaseGroup =
  | "action_required"
  | "follow_up"
  | "shared"
  | "closed"
  | "archived";

export type WorkspaceCaseSummary = {
  id: string;
  title: string;
  tripLabel: string;
  tripStartDate: string | null;
  serviceMix: ServiceLine[];
  commercialStatus: QuoteSession["commercialStatus"];
  status: QuoteSession["status"];
  archiveState: "active" | "archived";
  activeQuoteVersion: number;
  lastActivityAt: string;
  pendingCount: number;
  coverageState: CoverageState;
  lastAction: string;
  summary: string;
  requestedServicesLabel: string;
  workspaceGroup: WorkspaceCaseGroup;
};

export type CaseSheetField = {
  label: string;
  value: string;
};

export type CaseSheetView = {
  quoteSessionId: string;
  title: string;
  confirmedFacts: CaseSheetField[];
  blockers: string[];
  highValueMissingFields: string[];
  assumptions: string[];
  mode: {
    label: string;
    value: RecommendationMode;
  };
  coverageState: {
    label: string;
    value: CoverageState;
  };
  requestedServices: ServiceLine[];
  pendingItems: string[];
  operatorNote: string;
};

export type ActiveQuoteCategoryView = {
  serviceLine: ServiceLine;
  title: string;
  status: "selected" | "pending";
  pendingReason: string | null;
  selectedItem: NormalizedOption | null;
};

export type ActiveQuoteView = {
  quoteSessionId: string;
  title: string;
  tripLabel: string;
  tripStartDate: string | null;
  executiveSummary: string;
  coverageBanner: {
    label: string;
    value: CoverageState;
    message: string;
  };
  proposedTravelPlan: string[];
  categories: ActiveQuoteCategoryView[];
  pricingSummary: {
    currency: string;
    totalPrice: number;
    lineItems: Array<{
      amount: number;
      currency: string;
      serviceLine: ServiceLine;
      title: string;
    }>;
  };
  includedCharges: string[];
  notIncludedCharges: string[];
  reviewSeparatelyConditions: string[];
  pendingConditions: string[];
  versionMetadata: {
    activeQuoteVersion: number;
    commercialStatusLabel: string;
    recommendationModeLabel: string;
    updatedAt: string;
  };
  shareableSummary: string;
};

export type QuoteVersionSummary = {
  id: string;
  versionNumber: number;
  versionState: QuoteVersion["versionState"];
  coverageState: QuoteVersion["coverageState"];
  changeReason: string;
  diffSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationBlockKind =
  | "understanding_summary"
  | "blocking_clarification"
  | "high_value_clarification"
  | "ready_for_search"
  | "search_progress"
  | "result_handoff"
  | "contradiction_prompt"
  | "partial_fallback"
  | "resume_message";

export type ConversationBlockTone =
  | "assistant"
  | "danger"
  | "info"
  | "partial"
  | "resume"
  | "warning";

export type ConversationBlockView = {
  id: string;
  kind: ConversationBlockKind;
  contractCode:
    | "M-01"
    | "M-02"
    | "M-03"
    | "M-04"
    | "M-05"
    | "M-06"
    | "M-07"
    | "M-08"
    | "M-09";
  eyebrow: string;
  title: string;
  body: string;
  tone: ConversationBlockTone;
  details: string[];
  nextActions: string[];
};

export type ConversationOperatorMessageView = {
  id: string;
  content: string;
  createdAt: string;
};

export type ConversationStateCardView = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: "danger" | "info" | "partial" | "warning";
  nextActions: string[];
};

export type ConversationTimelineView = {
  quoteSessionId: string;
  tripLabel: string;
  activeQuoteVersion: number;
  collapseTranscript: boolean;
  blocks: ConversationBlockView[];
  operatorMessages: ConversationOperatorMessageView[];
  stateCards: ConversationStateCardView[];
};

export type CompareAttributePriority = "top" | "secondary";

export type CompareOptionView = {
  id: string;
  title: string;
  priceLabel: string;
  isActive: boolean;
  serviceLine: ServiceLine;
};

export type CompareAttributeRow = {
  id: string;
  label: string;
  priority: CompareAttributePriority;
  values: Array<{
    optionId: string;
    value: string;
  }>;
};

export type CompareMatrixView = {
  serviceLine: ServiceLine;
  options: CompareOptionView[];
  topRows: CompareAttributeRow[];
  secondaryRows: CompareAttributeRow[];
};

export type QuoteVersionChange<T extends string = string> = {
  from: T;
  to: T;
};

export type QuoteVersionDiffView = {
  comparedVersionId: string;
  comparedVersionNumber: number;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  categoriesAdded: Array<{
    serviceLine: ServiceLine;
    title: string;
  }>;
  categoriesRemoved: Array<{
    serviceLine: ServiceLine;
    title: string;
  }>;
  categoriesReplaced: Array<{
    serviceLine: ServiceLine;
    fromTitle: string;
    toTitle: string;
  }>;
  coverageStateChange: QuoteVersionChange<CoverageState> | null;
  recommendationModeChange: QuoteVersionChange<RecommendationMode> | null;
  commercialStatusChange: QuoteVersionChange<
    QuoteSession["commercialStatus"]
  > | null;
};

export type ResumeSnapshotView = {
  quoteSessionId: string;
  title: string;
  summary: string;
  activeQuoteVersion: number;
  commercialStatusLabel: string;
  lastAction: string;
  pendingItems: string[];
  quotePath: string;
  versionsPath: string;
  variant: "active" | "archived" | "follow_up";
  variantLabel: string;
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

const blockingFieldLabels: Record<string, string> = {
  child_ages: "Edades de menores",
  destination: "Destino o ruta exacta",
  occupancy: "Ocupacion del viaje",
  service_scope: "Servicios solicitados",
  travel_dates: "Fechas de viaje",
};

const auditEventLabels: Partial<Record<AuditEvent["eventName"], string>> = {
  bundle_review_refreshed: "Bundle actualizado",
  cart_item_removed: "Opcion retirada del quote",
  cart_item_selected: "Quote activo ajustado",
  clarification_answer_recorded: "Clarificacion recibida",
  commercial_status_updated: "Estado comercial actualizado",
  fallback_triggered: "Fallback visible",
  intake_extracted: "Intake interpretado",
  operator_message_appended: "Nuevo mensaje del operador",
  operator_note_saved: "Nota interna guardada",
  quote_export_generated: "Artefacto printable generado",
  quote_session_archived: "Caso archivado",
  quote_session_restored: "Caso reactivado",
  quote_version_synced: "Version sincronizada",
  readiness_validated: "Readiness validada",
  recommendation_mode_confirmed: "Modo confirmado",
  requote_change_applied: "Requote aplicado",
  search_execution_completed: "Busqueda completada",
  shortlist_created: "Shortlist disponible",
  state_transition_recorded: "Estado actualizado",
};

const serviceLineLabels: Record<ServiceLine, string> = {
  activity: "Actividad",
  hotel: "Hotel",
  transfer: "Transfer",
};

const getRequestedServiceLines = (record: QuoteRecord) =>
  [
    ...(record.intake?.requestedServiceLines ?? []),
    ...record.shortlists.map((shortlist) => shortlist.serviceLine),
    ...record.selectedItems.map((item) => item.serviceLine),
  ].filter(
    (serviceLine, index, values) => values.indexOf(serviceLine) === index,
  ) as ServiceLine[];

const getBlockedServiceLineNotes = (record: QuoteRecord) => {
  if (!record.intake) {
    return [];
  }

  return record.intake.requestedServiceLines
    .filter(
      (serviceLine) =>
        record.intake?.readinessByServiceLine[serviceLine] === "blocked",
    )
    .map((serviceLine) => {
      const candidate =
        record.intake?.extractedFields?.[`${serviceLine}ReadinessNote`];

      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }

      return `Todavia falta completar la capa de ${serviceLineLabels[serviceLine].toLowerCase()}.`;
    });
};

const getMissingFieldLabels = (record: QuoteRecord) =>
  (record.intake?.missingFields ?? []).map(
    (field) => blockingFieldLabels[field] ?? field,
  );

export const getCoverageState = (record: QuoteRecord): CoverageState => {
  const requestedServiceLines = getRequestedServiceLines(record);
  const selectedServiceLines = new Set(
    record.selectedItems.map((item) => item.serviceLine),
  );
  const unresolvedRequested = requestedServiceLines.filter(
    (serviceLine) => !selectedServiceLines.has(serviceLine),
  );
  const blockedServiceLines =
    record.intake?.requestedServiceLines.filter(
      (serviceLine) =>
        record.intake?.readinessByServiceLine[serviceLine] === "blocked",
    ) ?? [];
  const hasWeakShortlist = record.shortlists.some(
    (shortlist) =>
      shortlist.weakShortlist ||
      (shortlist.items.length === 0 && Boolean(shortlist.reason)),
  );
  const hasWarnings =
    buildBundleReviewView(record)?.warnings.length !== 0 ||
    record.selectedItems.some((item) => Boolean(item.caveat));

  if (
    record.intake?.missingFields.length ||
    record.session.status === "draft" ||
    record.session.status === "searching" ||
    (requestedServiceLines.length > 0 &&
      record.shortlists.length === 0 &&
      record.selectedItems.length === 0)
  ) {
    return "not-ready";
  }

  if (
    blockedServiceLines.length > 0 ||
    unresolvedRequested.length > 0 ||
    hasWeakShortlist ||
    hasWarnings
  ) {
    return "partial";
  }

  return "full";
};

const getPendingItems = (record: QuoteRecord) => {
  const bundleReview = buildBundleReviewView(record);
  const pending = [
    ...getMissingFieldLabels(record),
    ...getBlockedServiceLineNotes(record),
    ...(bundleReview?.blockers ?? []),
  ];

  if (record.session.pendingQuestion) {
    pending.push(record.session.pendingQuestion);
  }

  return pending.filter(
    (item, index, values) =>
      item.trim().length > 0 && values.indexOf(item) === index,
  );
};

const getLatestAuditEvent = (
  record: QuoteRecord,
  eventName?: AuditEvent["eventName"],
) =>
  [...record.auditEvents]
    .filter((event) => (eventName ? event.eventName === eventName : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ??
  null;

const getLastAction = (record: QuoteRecord) => {
  const latestAudit = getLatestAuditEvent(record);

  if (!latestAudit) {
    return "Caso creado";
  }

  return auditEventLabels[latestAudit.eventName] ?? latestAudit.eventName;
};

const getWorkspaceGroup = (record: QuoteRecord): WorkspaceCaseGroup => {
  if (
    record.session.status === "archived" ||
    record.session.commercialStatus === "archivada"
  ) {
    return "archived";
  }

  if (record.session.commercialStatus === "compartida") {
    return "shared";
  }

  if (record.session.commercialStatus === "en_seguimiento") {
    return "follow_up";
  }

  if (
    record.session.status === "closed" ||
    record.session.commercialStatus === "avanzo_fuera_del_sistema" ||
    record.session.commercialStatus === "cerrada_sin_avance"
  ) {
    return "closed";
  }

  return "action_required";
};

const normalizeValues = (values: Array<string | null | undefined>) =>
  values
    .map((value) => value?.trim() ?? "")
    .filter(
      (value, index, collection) =>
        value.length > 0 && collection.indexOf(value) === index,
    );

const joinValues = (
  values: Array<string | null | undefined>,
  separator = " | ",
) => {
  const normalized = normalizeValues(values);
  return normalized.length > 0 ? normalized.join(separator) : null;
};

const getMetadataValue = (option: NormalizedOption, key: string) => {
  const value = option.supplierMetadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const classifyPricingConditions = (
  conditions: string[],
  lineItems: ActiveQuoteView["pricingSummary"]["lineItems"],
) => {
  const includedCharges = lineItems.map(
    (item) => `${item.title} - ${item.currency} ${item.amount}`,
  );
  const notIncludedCharges = conditions.filter((condition) =>
    /tax|impuest|fee|no inclu|not includ|check-in|resort/i.test(condition),
  );
  const reviewSeparatelyConditions = conditions.filter(
    (condition) => !notIncludedCharges.includes(condition),
  );

  return {
    includedCharges,
    notIncludedCharges,
    reviewSeparatelyConditions,
  };
};

const buildQuoteCategorySummary = (item: NormalizedOption) =>
  `${serviceLineLabels[item.serviceLine]}: ${item.title} (${item.currency} ${item.headlinePrice})`;

export const buildWorkspaceCaseSummary = (
  record: QuoteRecord,
): WorkspaceCaseSummary => {
  const serviceMix = getRequestedServiceLines(record);

  return {
    id: record.session.id,
    title: record.session.title,
    tripLabel: record.session.tripLabel,
    tripStartDate: record.session.tripStartDate,
    serviceMix,
    commercialStatus: record.session.commercialStatus,
    status: record.session.status,
    archiveState:
      record.session.status === "archived" ||
      record.session.commercialStatus === "archivada"
        ? "archived"
        : "active",
    activeQuoteVersion: record.session.activeQuoteVersion,
    lastActivityAt: record.session.lastActivityAt,
    pendingCount: getPendingItems(record).length,
    coverageState: getCoverageState(record),
    lastAction: getLastAction(record),
    summary: record.session.latestContextSummary,
    requestedServicesLabel:
      serviceMix.length > 0
        ? serviceMix
            .map((serviceLine) => serviceLineLabels[serviceLine])
            .join(" + ")
        : "Pendiente de definir",
    workspaceGroup: getWorkspaceGroup(record),
  };
};

const buildConfirmedFacts = (record: QuoteRecord): CaseSheetField[] => {
  if (!record.intake) {
    return [];
  }

  const facts: CaseSheetField[] = [];
  const destination = record.intake.extractedFields.destination;
  const travelDates = record.intake.extractedFields.travelDates;
  const adults = record.intake.extractedFields.adults;
  const children = record.intake.extractedFields.children;
  const selectedHotel = record.intake.extractedFields.selectedHotelTitle;
  const transferFrom = record.intake.extractedFields.transferFromLabel;
  const transferTo = record.intake.extractedFields.transferToLabel;

  if (typeof destination === "string" && destination.trim().length > 0) {
    facts.push({
      label: "Destino",
      value: destination,
    });
  }

  if (Array.isArray(travelDates) && travelDates.length > 0) {
    facts.push({
      label: "Fechas",
      value: travelDates.join(" / "),
    });
  }

  if (typeof adults === "number") {
    const childrenLabel =
      typeof children === "number" && children > 0
        ? `, ${children} menores`
        : "";
    facts.push({
      label: "Pasajeros",
      value: `${adults} adultos${childrenLabel}`,
    });
  }

  if (typeof selectedHotel === "string" && selectedHotel.trim().length > 0) {
    facts.push({
      label: "Hotel seleccionado",
      value: selectedHotel,
    });
  }

  if (typeof transferFrom === "string" && transferFrom.trim().length > 0) {
    facts.push({
      label: "Pickup",
      value: transferFrom,
    });
  }

  if (typeof transferTo === "string" && transferTo.trim().length > 0) {
    facts.push({
      label: "Dropoff",
      value: transferTo,
    });
  }

  return facts;
};

const buildAssumptions = (record: QuoteRecord) => {
  const assumptions = [
    ...record.shortlists
      .filter((shortlist) => shortlist.weakShortlist && shortlist.reason)
      .map((shortlist) => shortlist.reason ?? ""),
    ...record.selectedItems
      .filter((item) => item.caveat)
      .map((item) => item.caveat ?? ""),
  ];

  return assumptions.filter(
    (assumption, index, values) =>
      assumption.trim().length > 0 && values.indexOf(assumption) === index,
  );
};

export const buildCaseSheetView = (record: QuoteRecord): CaseSheetView => ({
  quoteSessionId: record.session.id,
  title: record.session.tripLabel,
  confirmedFacts: buildConfirmedFacts(record),
  blockers: [
    ...getMissingFieldLabels(record),
    ...getBlockedServiceLineNotes(record),
  ],
  highValueMissingFields: getMissingFieldLabels(record),
  assumptions: buildAssumptions(record),
  mode: {
    label: recommendationModeLabels[record.session.recommendationMode],
    value: record.session.recommendationMode,
  },
  coverageState: {
    label: coverageStateLabels[getCoverageState(record)],
    value: getCoverageState(record),
  },
  requestedServices: getRequestedServiceLines(record),
  pendingItems: getPendingItems(record),
  operatorNote: record.operatorNote?.content ?? "",
});

const buildPendingReasonByServiceLine = (record: QuoteRecord) => {
  const reasons = new Map<ServiceLine, string>();

  for (const serviceLine of getRequestedServiceLines(record)) {
    const selectedItem = record.selectedItems.find(
      (item) => item.serviceLine === serviceLine,
    );

    if (selectedItem) {
      continue;
    }

    const shortlist = record.shortlists.find(
      (candidate) => candidate.serviceLine === serviceLine,
    );

    if (shortlist?.reason) {
      reasons.set(serviceLine, shortlist.reason);
      continue;
    }

    const readinessNote =
      record.intake?.extractedFields?.[`${serviceLine}ReadinessNote`];

    if (typeof readinessNote === "string" && readinessNote.trim().length > 0) {
      reasons.set(serviceLine, readinessNote.trim());
      continue;
    }

    reasons.set(
      serviceLine,
      `Todavia no hay una seleccion activa para ${serviceLineLabels[serviceLine].toLowerCase()}.`,
    );
  }

  return reasons;
};

const buildCoverageBannerMessage = (
  coverageState: CoverageState,
  pendingConditions: string[],
) => {
  if (coverageState === "full") {
    return "La version activa cubre todas las capas solicitadas y ya puede compartirse con caveats visibles si aplican.";
  }

  if (coverageState === "partial") {
    return (
      pendingConditions[0] ??
      "La cotizacion es parcial y requiere caveats visibles antes de compartir."
    );
  }

  return (
    pendingConditions[0] ??
    "La cotizacion todavia no esta lista para compartir."
  );
};

const buildActiveQuoteViewModel = (input: {
  activeQuoteVersion: number;
  commercialStatus: QuoteSession["commercialStatus"];
  confirmedStateSummary: string;
  coverageState: CoverageState;
  pendingConditions: string[];
  quoteSessionId: string;
  recommendationMode: RecommendationMode;
  selectedItems: NormalizedOption[];
  title: string;
  tripLabel: string;
  tripStartDate: string | null;
  updatedAt: string;
  requestedServices: ServiceLine[];
  pendingReasons: Map<ServiceLine, string>;
  pricingSummary: {
    currency: string;
    totalPrice: number;
    lineItems: Array<{
      amount: number;
      currency: string;
      serviceLine: ServiceLine;
      title: string;
    }>;
  };
}): ActiveQuoteView => {
  const proposedTravelPlan = input.selectedItems.map(buildQuoteCategorySummary);
  const categories = input.requestedServices.map<ActiveQuoteCategoryView>(
    (serviceLine) => {
      const selectedItem =
        input.selectedItems.find((item) => item.serviceLine === serviceLine) ??
        null;

      return {
        serviceLine,
        title: serviceLineLabels[serviceLine],
        status: selectedItem ? "selected" : "pending",
        pendingReason: selectedItem
          ? null
          : (input.pendingReasons.get(serviceLine) ?? null),
        selectedItem,
      };
    },
  );
  const pricingConditions = classifyPricingConditions(
    input.pendingConditions,
    input.pricingSummary.lineItems,
  );
  const shareableLines = [
    `${input.tripLabel} | v${input.activeQuoteVersion}`,
    input.confirmedStateSummary,
    ...proposedTravelPlan,
  ];

  if (input.pricingSummary.currency) {
    shareableLines.push(
      `Total estimado: ${input.pricingSummary.currency} ${input.pricingSummary.totalPrice}`,
    );
  }

  if (input.pendingConditions.length > 0) {
    shareableLines.push(
      `Condiciones pendientes: ${input.pendingConditions.join(" | ")}`,
    );
  }

  if (pricingConditions.notIncludedCharges.length > 0) {
    shareableLines.push(
      `No incluidos: ${pricingConditions.notIncludedCharges.join(" | ")}`,
    );
  }

  if (pricingConditions.reviewSeparatelyConditions.length > 0) {
    shareableLines.push(
      `Revisar por separado: ${pricingConditions.reviewSeparatelyConditions.join(" | ")}`,
    );
  }

  return {
    quoteSessionId: input.quoteSessionId,
    title: input.title,
    tripLabel: input.tripLabel,
    tripStartDate: input.tripStartDate,
    executiveSummary: input.confirmedStateSummary,
    coverageBanner: {
      label: coverageStateLabels[input.coverageState],
      value: input.coverageState,
      message: buildCoverageBannerMessage(
        input.coverageState,
        input.pendingConditions,
      ),
    },
    proposedTravelPlan,
    categories,
    pricingSummary: input.pricingSummary,
    includedCharges: pricingConditions.includedCharges,
    notIncludedCharges: pricingConditions.notIncludedCharges,
    reviewSeparatelyConditions: pricingConditions.reviewSeparatelyConditions,
    pendingConditions: input.pendingConditions,
    versionMetadata: {
      activeQuoteVersion: input.activeQuoteVersion,
      commercialStatusLabel: commercialStatusLabels[input.commercialStatus],
      recommendationModeLabel:
        recommendationModeLabels[input.recommendationMode],
      updatedAt: input.updatedAt,
    },
    shareableSummary: shareableLines.join("\n"),
  };
};

export const buildActiveQuoteView = (record: QuoteRecord): ActiveQuoteView => {
  const coverageState = getCoverageState(record);
  const bundleReview = buildBundleReviewView(record);
  const pendingConditions = [
    ...getPendingItems(record),
    ...(bundleReview?.warnings ?? []),
    ...record.selectedItems
      .filter((item) => item.caveat)
      .map((item) => item.caveat ?? ""),
  ].filter(
    (condition, index, values) =>
      condition.trim().length > 0 && values.indexOf(condition) === index,
  );
  const requestedServices = getRequestedServiceLines(record);
  const pendingReasons = buildPendingReasonByServiceLine(record);

  return buildActiveQuoteViewModel({
    activeQuoteVersion: record.session.activeQuoteVersion,
    commercialStatus: record.session.commercialStatus,
    confirmedStateSummary: record.session.latestContextSummary,
    coverageState,
    pendingConditions,
    quoteSessionId: record.session.id,
    recommendationMode: record.session.recommendationMode,
    selectedItems: record.selectedItems,
    title: record.session.title,
    tripLabel: record.session.tripLabel,
    tripStartDate: record.session.tripStartDate,
    updatedAt: record.session.updatedAt,
    requestedServices,
    pendingReasons,
    pricingSummary: {
      currency: bundleReview?.currency ?? "",
      totalPrice: bundleReview?.totalPrice ?? 0,
      lineItems: record.selectedItems.map((item) => ({
        amount: item.headlinePrice,
        currency: item.currency,
        serviceLine: item.serviceLine,
        title: item.title,
      })),
    },
  });
};

export const buildActiveQuoteViewFromSnapshot = (
  snapshot: QuoteExportSnapshot,
): ActiveQuoteView =>
  buildActiveQuoteViewModel({
    activeQuoteVersion: snapshot.activeQuoteVersion,
    commercialStatus: snapshot.commercialStatus,
    confirmedStateSummary: snapshot.confirmedStateSummary,
    coverageState:
      snapshot.bundleReview.blockers.length > 0 ||
      snapshot.bundleReview.warnings.length > 0 ||
      snapshot.selectedItems.some((item) => Boolean(item.caveat))
        ? "partial"
        : "full",
    pendingConditions: [
      ...snapshot.bundleReview.blockers,
      ...snapshot.bundleReview.warnings,
      ...snapshot.selectedItems
        .filter((item) => item.caveat)
        .map((item) => item.caveat ?? ""),
    ].filter(
      (condition, index, values) =>
        condition.trim().length > 0 && values.indexOf(condition) === index,
    ),
    quoteSessionId: snapshot.quoteSessionId,
    recommendationMode: snapshot.recommendationMode,
    selectedItems: snapshot.selectedItems,
    title: snapshot.title,
    tripLabel: snapshot.tripLabel,
    tripStartDate: snapshot.tripStartDate,
    updatedAt: snapshot.createdAt,
    requestedServices: snapshot.selectedItems.map((item) => item.serviceLine),
    pendingReasons: new Map(),
    pricingSummary: {
      currency: snapshot.bundleReview.currency,
      totalPrice: snapshot.bundleReview.totalPrice,
      lineItems: snapshot.selectedItems.map((item) => ({
        amount: item.headlinePrice,
        currency: item.currency,
        serviceLine: item.serviceLine,
        title: item.title,
      })),
    },
  });

export const buildQuoteVersionSummaries = (record: QuoteRecord) =>
  [...record.quoteVersions]
    .sort((left, right) => right.versionNumber - left.versionNumber)
    .map<QuoteVersionSummary>((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      versionState: version.versionState,
      coverageState: version.coverageState,
      changeReason: version.changeReason,
      diffSummary: version.diffSummary,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    }));

const getVersionSelectedItems = (version: QuoteVersion) =>
  Array.isArray(version.payload.selectedItems)
    ? (version.payload.selectedItems as NormalizedOption[])
    : [];

const getVersionRecommendationMode = (version: QuoteVersion) =>
  typeof version.payload.recommendationMode === "string"
    ? (version.payload.recommendationMode as RecommendationMode)
    : null;

const getVersionCommercialStatus = (version: QuoteVersion) =>
  typeof version.payload.commercialStatus === "string"
    ? (version.payload.commercialStatus as QuoteSession["commercialStatus"])
    : null;

const buildConversationBlocks = (record: QuoteRecord) => {
  const blocks: ConversationBlockView[] = [];
  const coverageState = getCoverageState(record);
  const bundleReview = buildBundleReviewView(record);
  const blockers = [
    ...getMissingFieldLabels(record),
    ...getBlockedServiceLineNotes(record),
  ];
  const highValueClarifications = normalizeValues([
    ...(bundleReview?.warnings ?? []),
    ...buildAssumptions(record),
  ]);
  const readyServiceLines =
    record.intake?.requestedServiceLines.filter(
      (serviceLine) =>
        record.intake?.readinessByServiceLine[serviceLine] === "ready",
    ) ?? [];
  const latestRestoreAudit = getLatestAuditEvent(
    record,
    "quote_session_restored",
  );
  const hasNoResults =
    record.shortlists.length > 0 &&
    record.shortlists.every((shortlist) => shortlist.items.length === 0);
  const hasPartialFallback =
    coverageState === "partial" ||
    hasNoResults ||
    record.shortlists.some(
      (shortlist) => shortlist.weakShortlist || Boolean(shortlist.reason),
    );

  if (latestRestoreAudit) {
    blocks.push({
      id: "resume-message",
      kind: "resume_message",
      contractCode: "M-09",
      eyebrow: "Resume message",
      title: "Continuidad restaurada",
      body: "El caso reabierto vuelve a mostrar primero el resumen operativo, la version activa y los pendientes antes del transcript.",
      tone: "resume",
      details: normalizeValues([
        `Version activa: v${record.session.activeQuoteVersion}`,
        `Estado comercial: ${commercialStatusLabels[record.session.commercialStatus]}`,
        getLastAction(record),
      ]),
      nextActions: ["Open active quote", "Open versions"],
    });
  }

  if (record.session.latestContextSummary.trim().length > 0) {
    blocks.push({
      id: "understanding-summary",
      kind: "understanding_summary",
      contractCode: "M-01",
      eyebrow: "Understanding summary",
      title: record.session.tripLabel,
      body: record.session.latestContextSummary,
      tone: "assistant",
      details: normalizeValues([
        record.session.pendingQuestion,
        record.intake?.requestedServiceLines.length
          ? `Servicios: ${record.intake.requestedServiceLines.map((serviceLine) => serviceLineLabels[serviceLine]).join(" + ")}`
          : null,
      ]),
      nextActions: ["Review case sheet"],
    });
  }

  if ((record.intake?.contradictions.length ?? 0) > 0) {
    blocks.push({
      id: "contradiction-prompt",
      kind: "contradiction_prompt",
      contractCode: "M-07",
      eyebrow: "Contradiction prompt",
      title: "Hay datos contradictorios en el caso",
      body: "Antes de seguir, confirma la version correcta del dato contradictorio para no degradar la cotizacion.",
      tone: "warning",
      details: record.intake?.contradictions ?? [],
      nextActions: ["Confirm contradiction", "Update traveler facts"],
    });
  }

  if (blockers.length > 0) {
    blocks.push({
      id: "blocking-clarification",
      kind: "blocking_clarification",
      contractCode: "M-02",
      eyebrow: "Blocking clarification",
      title: record.session.pendingQuestion ?? "Falta clarificacion minima",
      body: "La busqueda sigue bloqueada hasta cerrar los campos minimos o supplier-ready que faltan.",
      tone: "danger",
      details: blockers,
      nextActions: ["Answer blocker"],
    });
  }

  if (blockers.length === 0 && highValueClarifications.length > 0) {
    blocks.push({
      id: "high-value-clarification",
      kind: "high_value_clarification",
      contractCode: "M-03",
      eyebrow: "High-value clarification",
      title: "Conviene cerrar algunas precisiones antes de compartir",
      body: "La cotizacion ya es navegable, pero todavia hay detalles de alto valor que conviene confirmar o mantener visibles.",
      tone: "warning",
      details: highValueClarifications,
      nextActions: ["Review caveats", "Confirm assumptions"],
    });
  }

  if (
    record.intake &&
    blockers.length === 0 &&
    readyServiceLines.length > 0 &&
    record.shortlists.length === 0 &&
    record.session.status !== "searching"
  ) {
    blocks.push({
      id: "ready-for-search",
      kind: "ready_for_search",
      contractCode: "M-04",
      eyebrow: "Ready for search",
      title: "El caso ya esta supplier-ready",
      body: "Los anchors minimos estan resueltos y la busqueda puede ejecutarse sin volver a pedir el caso completo.",
      tone: "info",
      details: readyServiceLines.map(
        (serviceLine) =>
          `Listo para ${serviceLineLabels[serviceLine].toLowerCase()}`,
      ),
      nextActions: ["Run supplier search"],
    });
  }

  if (record.session.status === "searching") {
    blocks.push({
      id: "search-progress",
      kind: "search_progress",
      contractCode: "M-05",
      eyebrow: "Search progress",
      title: "Busqueda supplier-ready en curso",
      body: "El workbench mantiene visible el progreso y no oculta el estado actual del caso mientras llegan resultados.",
      tone: "info",
      details: readyServiceLines.map(
        (serviceLine) =>
          `Consultando ${serviceLineLabels[serviceLine].toLowerCase()}`,
      ),
      nextActions: ["Review case sheet"],
    });
  }

  if (record.shortlists.length > 0 && !hasNoResults) {
    blocks.push({
      id: "result-handoff",
      kind: "result_handoff",
      contractCode: "M-06",
      eyebrow: "Result handoff",
      title:
        record.selectedItems.length > 0
          ? "Hay resultados listos para revision comercial"
          : "Las shortlists ya estan listas para review",
      body:
        record.selectedItems.length > 0
          ? "El quote activo ya tiene una seleccion principal por categoria y puede revisarse en la vista comercial."
          : "Las opciones ya estan agrupadas por categoria para seleccionar, comparar o promover al quote activo.",
      tone: "assistant",
      details: [
        ...record.shortlists.map(
          (shortlist) =>
            `${serviceLineLabels[shortlist.serviceLine]}: ${shortlist.items.length} opcion(es)`,
        ),
        ...record.selectedItems.map(buildQuoteCategorySummary),
      ],
      nextActions: ["Review shortlists", "Open active quote"],
    });
  }

  if (hasPartialFallback) {
    const fallbackDetails = normalizeValues([
      ...(bundleReview?.warnings ?? []),
      ...record.shortlists
        .filter(
          (shortlist) =>
            shortlist.weakShortlist || shortlist.items.length === 0,
        )
        .map((shortlist) => shortlist.reason ?? null),
      ...record.selectedItems.map((item) => item.caveat),
    ]);

    blocks.push({
      id: "partial-fallback",
      kind: "partial_fallback",
      contractCode: "M-08",
      eyebrow: hasNoResults ? "No results" : "Partial / fallback",
      title: hasNoResults
        ? "La busqueda no devolvio opciones activas"
        : "La cobertura actual sigue siendo parcial",
      body: hasNoResults
        ? "No hubo resultados utilizables para la capa solicitada y el operador necesita escoger el recovery path visible."
        : "La continuidad del quote debe mantener caveats visibles hasta cerrar la cobertura faltante.",
      tone: "partial",
      details: fallbackDetails,
      nextActions: [
        "Request more options",
        "Review caveats",
        "Open active quote",
      ],
    });
  }

  return blocks;
};

export const buildConversationTimelineView = (
  record: QuoteRecord,
): ConversationTimelineView => ({
  quoteSessionId: record.session.id,
  tripLabel: record.session.tripLabel,
  activeQuoteVersion: record.session.activeQuoteVersion,
  collapseTranscript:
    getLatestAuditEvent(record, "quote_session_restored") !== null,
  blocks: buildConversationBlocks(record),
  operatorMessages: record.messages
    .filter((message) => message.role === "operator")
    .map((message) => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
    })),
  stateCards: (() => {
    const cards: ConversationStateCardView[] = [];

    if ((record.intake?.missingFields.length ?? 0) > 0) {
      cards.push({
        id: "blocked-intake",
        eyebrow: "Blocked intake",
        title: record.session.pendingQuestion ?? "Falta clarificacion minima",
        body: "El intake sigue bloqueado hasta confirmar los campos minimos faltantes.",
        tone: "danger",
        nextActions: ["Answer blocker"],
      });
    }

    if (record.session.status === "searching") {
      cards.push({
        id: "search-progress",
        eyebrow: "Search progress",
        title: "Consultando capas listas",
        body: "La busqueda supplier-ready sigue en progreso.",
        tone: "info",
        nextActions: ["Review case sheet"],
      });
    }

    if (
      record.shortlists.length > 0 &&
      record.shortlists.every((shortlist) => shortlist.items.length === 0)
    ) {
      cards.push({
        id: "no-results",
        eyebrow: "No results",
        title: "La busqueda no devolvio opciones activas",
        body: "No hubo resultados utilizables y el operador necesita decidir el siguiente recovery path.",
        tone: "warning",
        nextActions: ["Request more options"],
      });
    }

    if (
      getCoverageState(record) === "partial" ||
      record.shortlists.some(
        (shortlist) => shortlist.weakShortlist || Boolean(shortlist.reason),
      )
    ) {
      cards.push({
        id: "partial-coverage",
        eyebrow: "Partial coverage",
        title: "La cobertura actual es parcial",
        body: "Hay una capa parcial o debil y debe mantenerse visible en la continuidad operator-facing.",
        tone: "partial",
        nextActions: ["Review caveats", "Open active quote"],
      });
    }

    return cards;
  })(),
});

export const buildCompareMatrixView = (
  options: NormalizedOption[],
  activeOptionIds: string[] = [],
): CompareMatrixView | null => {
  const serviceLine = options[0]?.serviceLine;

  if (
    !serviceLine ||
    options.some((option) => option.serviceLine !== serviceLine)
  ) {
    return null;
  }

  const buildRow = (
    id: string,
    label: string,
    priority: CompareAttributePriority,
    resolver: (option: NormalizedOption) => string | null,
  ): CompareAttributeRow => ({
    id,
    label,
    priority,
    values: options.map((option) => ({
      optionId: option.id,
      value: resolver(option) ?? "—",
    })),
  });

  const commonRows: CompareAttributeRow[] = [
    buildRow(
      "price",
      "Price",
      "top",
      (option) => `${option.currency} ${option.headlinePrice}`,
    ),
    buildRow("availability", "Availability / cancellation", "top", (option) =>
      joinValues(
        [
          option.availabilityState.replace(/_/g, " "),
          getMetadataValue(option, "cancellationPolicy"),
          getMetadataValue(option, "rateType"),
          option.tradeoff,
        ],
        " | ",
      ),
    ),
    buildRow("fit", "Fit", "top", (option) => option.whyItFits),
    buildRow("caveat", "Caveat", "top", (option) => option.caveat),
    buildRow(
      "destination",
      "Destination",
      "top",
      (option) => option.destination,
    ),
  ];

  const secondaryRows: CompareAttributeRow[] =
    serviceLine === "hotel"
      ? [
          buildRow(
            "hotel-code-name",
            "Hotel code / name",
            "secondary",
            (option) =>
              joinValues([getMetadataValue(option, "hotelCode"), option.title]),
          ),
          buildRow(
            "hotel-constraints",
            "Operational constraints",
            "secondary",
            (option) =>
              joinValues([
                getMetadataValue(option, "board"),
                getMetadataValue(option, "roomType"),
                getMetadataValue(option, "operationalConstraints"),
                option.tradeoff,
              ]),
          ),
        ]
      : serviceLine === "transfer"
        ? [
            buildRow(
              "transfer-route",
              "Route / provider",
              "secondary",
              (option) =>
                joinValues([
                  getMetadataValue(option, "transferFromLabel"),
                  getMetadataValue(option, "transferToLabel"),
                  getMetadataValue(option, "provider"),
                ]),
            ),
            buildRow("transfer-vehicle", "Vehicle", "secondary", (option) =>
              joinValues([
                getMetadataValue(option, "vehicle"),
                getMetadataValue(option, "vehicleType"),
              ]),
            ),
          ]
        : [
            buildRow("activity-modality", "Modality", "secondary", (option) =>
              joinValues([
                getMetadataValue(option, "modality"),
                getMetadataValue(option, "category"),
              ]),
            ),
            buildRow("activity-timing", "Timing", "secondary", (option) =>
              joinValues([
                getMetadataValue(option, "timing"),
                getMetadataValue(option, "startTime"),
                getMetadataValue(option, "duration"),
              ]),
            ),
          ];

  return {
    serviceLine,
    options: options.map((option) => ({
      id: option.id,
      title: option.title,
      priceLabel: `${option.currency} ${option.headlinePrice}`,
      isActive: activeOptionIds.includes(option.id),
      serviceLine: option.serviceLine,
    })),
    topRows: commonRows,
    secondaryRows,
  };
};

export const buildQuoteVersionDiffView = (
  record: QuoteRecord,
  comparedVersionId: string,
): QuoteVersionDiffView | null => {
  const comparedVersion = record.quoteVersions.find(
    (version) => version.id === comparedVersionId,
  );
  const activeVersion =
    record.quoteVersions.find((version) => version.versionState === "active") ??
    null;

  if (!comparedVersion) {
    return null;
  }

  const comparedItems = getVersionSelectedItems(comparedVersion);
  const activeItems = activeVersion
    ? getVersionSelectedItems(activeVersion)
    : [];
  const comparedByServiceLine = new Map(
    comparedItems.map((item) => [item.serviceLine, item]),
  );
  const activeByServiceLine = new Map(
    activeItems.map((item) => [item.serviceLine, item]),
  );
  const categoriesAdded = activeItems
    .filter((item) => !comparedByServiceLine.has(item.serviceLine))
    .map((item) => ({
      serviceLine: item.serviceLine,
      title: item.title,
    }));
  const categoriesRemoved = comparedItems
    .filter((item) => !activeByServiceLine.has(item.serviceLine))
    .map((item) => ({
      serviceLine: item.serviceLine,
      title: item.title,
    }));
  const categoriesReplaced = activeItems
    .filter((item) => {
      const previous = comparedByServiceLine.get(item.serviceLine);
      return Boolean(previous && previous.id !== item.id);
    })
    .map((item) => ({
      serviceLine: item.serviceLine,
      fromTitle: comparedByServiceLine.get(item.serviceLine)?.title ?? "—",
      toTitle: item.title,
    }));
  const comparedRecommendationMode =
    getVersionRecommendationMode(comparedVersion);
  const activeRecommendationMode = activeVersion
    ? getVersionRecommendationMode(activeVersion)
    : null;
  const comparedCommercialStatus = getVersionCommercialStatus(comparedVersion);
  const activeCommercialStatus = activeVersion
    ? getVersionCommercialStatus(activeVersion)
    : null;

  return {
    comparedVersionId: comparedVersion.id,
    comparedVersionNumber: comparedVersion.versionNumber,
    activeVersionId: activeVersion?.id ?? null,
    activeVersionNumber: activeVersion?.versionNumber ?? null,
    categoriesAdded,
    categoriesRemoved,
    categoriesReplaced,
    coverageStateChange:
      activeVersion &&
      comparedVersion.coverageState !== activeVersion.coverageState
        ? {
            from: comparedVersion.coverageState,
            to: activeVersion.coverageState,
          }
        : null,
    recommendationModeChange:
      activeVersion &&
      comparedRecommendationMode &&
      activeRecommendationMode &&
      comparedRecommendationMode !== activeRecommendationMode
        ? {
            from: comparedRecommendationMode,
            to: activeRecommendationMode,
          }
        : null,
    commercialStatusChange:
      activeVersion &&
      comparedCommercialStatus &&
      activeCommercialStatus &&
      comparedCommercialStatus !== activeCommercialStatus
        ? {
            from: comparedCommercialStatus,
            to: activeCommercialStatus,
          }
        : null,
  };
};

export const buildResumeSnapshotView = (
  record: QuoteRecord,
): ResumeSnapshotView | null => {
  if (!getLatestAuditEvent(record, "quote_session_restored")) {
    return null;
  }

  const variant =
    record.session.status === "archived" ||
    record.session.commercialStatus === "archivada"
      ? "archived"
      : record.session.commercialStatus === "en_seguimiento"
        ? "follow_up"
        : "active";

  return {
    quoteSessionId: record.session.id,
    title: record.session.tripLabel,
    summary: record.session.latestContextSummary,
    activeQuoteVersion: record.session.activeQuoteVersion,
    commercialStatusLabel:
      commercialStatusLabels[record.session.commercialStatus],
    lastAction: getLastAction(record),
    pendingItems: getPendingItems(record),
    quotePath: `/quotes/${record.session.id}/quote`,
    versionsPath: `/quotes/${record.session.id}/versions`,
    variant,
    variantLabel:
      variant === "archived"
        ? "Archived continuity"
        : variant === "follow_up"
          ? "Follow-up continuity"
          : "Active continuity",
  };
};

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
      | "recommendationMode"
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

export {
  commercialStatusLabels,
  coverageStateLabels,
  quoteStateLabels,
  recommendationModeLabels,
};
