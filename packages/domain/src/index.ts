import { z } from "@alana/shared";

export const quoteSessionStateValues = [
  "draft",
  "clarifying",
  "searching",
  "reviewing",
  "export_ready",
  "exported",
  "escalated",
  "closed",
  "archived",
] as const;

export const commercialStatusValues = [
  "abierta",
  "en_seguimiento",
  "compartida",
  "avanzo_fuera_del_sistema",
  "cerrada_sin_avance",
  "archivada",
] as const;

export const serviceLineValues = ["hotel", "transfer", "activity"] as const;
export const serviceLineReadinessValues = [
  "blocked",
  "ready",
  "partial",
] as const;
export const recommendationModeValues = [
  "best_match",
  "three_options",
  "exact",
] as const;
export const quoteCommandNames = [
  "start_quote_session",
  "append_operator_message",
  "submit_clarification_answer",
  "confirm_recommendation_mode",
  "run_service_search",
  "request_more_options",
  "apply_requote_change",
  "select_option_for_cart",
  "replace_cart_item",
  "remove_cart_item",
  "archive_quote_session",
  "restore_quote_session",
  "refresh_bundle_review",
  "generate_quote_pdf",
  "resume_quote_session",
] as const;

export type QuoteSessionState = (typeof quoteSessionStateValues)[number];
export type CommercialStatus = (typeof commercialStatusValues)[number];
export type ServiceLine = (typeof serviceLineValues)[number];
export type ServiceLineReadiness = (typeof serviceLineReadinessValues)[number];
export type RecommendationMode = (typeof recommendationModeValues)[number];
export type QuoteCommandName = (typeof quoteCommandNames)[number];

export type OperatorProfile = {
  id: string;
  email: string;
  fullName: string;
  role: "operator" | "admin";
};

export type QuoteSession = {
  id: string;
  operatorId: string;
  title: string;
  agencyName: string;
  tripLabel: string;
  tripStartDate: string | null;
  status: QuoteSessionState;
  commercialStatus: CommercialStatus;
  recommendationMode: RecommendationMode;
  activeQuoteVersion: number;
  latestContextSummary: string;
  pendingQuestion: string | null;
  lastActivityAt: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteMessage = {
  id: string;
  quoteSessionId: string;
  role: "operator" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type BlockingField =
  | "destination"
  | "travel_dates"
  | "occupancy"
  | "service_scope"
  | "child_ages";

export type StructuredIntake = {
  id: string;
  quoteSessionId: string;
  requestedServiceLines: ServiceLine[];
  extractedFields: Record<string, string | number | boolean | string[]>;
  missingFields: BlockingField[];
  contradictions: string[];
  readinessByServiceLine: Partial<Record<ServiceLine, ServiceLineReadiness>>;
  createdAt: string;
};

export type NormalizedOption = {
  id: string;
  serviceLine: ServiceLine;
  title: string;
  destination: string;
  headlinePrice: number;
  currency: string;
  whyItFits: string;
  tradeoff: string;
  caveat: string | null;
  availabilityState: "available" | "recheck_required" | "partial";
  supplierMetadata: Record<string, string>;
};

export type Shortlist = {
  id: string;
  quoteSessionId: string;
  serviceLine: ServiceLine;
  items: NormalizedOption[];
  weakShortlist: boolean;
  reason: string | null;
};

export type BundleReviewView = {
  isExportReady: boolean;
  blockers: string[];
  warnings: string[];
  selectedItems: NormalizedOption[];
  totalPrice: number;
  currency: string;
  activeQuoteVersion: number;
};

export type ContextPackage = {
  metadata: Pick<
    QuoteSession,
    | "id"
    | "title"
    | "agencyName"
    | "tripLabel"
    | "tripStartDate"
    | "status"
    | "commercialStatus"
    | "recommendationMode"
    | "activeQuoteVersion"
  >;
  confirmedStateSummary: string;
  missingFields: BlockingField[];
  pendingQuestion: string | null;
  recentMessages: QuoteMessage[];
  selectedItems: NormalizedOption[];
  shortlists: Shortlist[];
  bundleReview: BundleReviewView | null;
};

export type QuoteExportSnapshot = {
  id: string;
  quoteSessionId: string;
  summary: string;
  createdAt: string;
  title: string;
  agencyName: string;
  tripLabel: string;
  tripStartDate: string | null;
  status: QuoteSessionState;
  commercialStatus: CommercialStatus;
  recommendationMode: RecommendationMode;
  activeQuoteVersion: number;
  confirmedStateSummary: string;
  selectedItems: NormalizedOption[];
  bundleReview: BundleReviewView;
};

export type QuoteExport = {
  id: string;
  quoteSessionId: string;
  snapshotId: string;
  activeQuoteVersion: number;
  fileName: string;
  mimeType: string;
  storageBucket: string;
  storagePath: string;
  fileSizeBytes: number;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  quoteSessionId: string;
  eventName:
    | "quote_session_created"
    | "operator_message_appended"
    | "clarification_answer_recorded"
    | "intake_extracted"
    | "readiness_validated"
    | "search_execution_completed"
    | "fallback_triggered"
    | "shortlist_created"
    | "state_transition_recorded"
    | "cart_item_selected"
    | "cart_item_removed"
    | "bundle_review_refreshed"
    | "quote_export_generated"
    | "quote_session_archived";
  createdAt: string;
  payload: Record<string, string | number | boolean | null>;
};

export const quoteSessionStateSchema = z.enum(quoteSessionStateValues);
export const commercialStatusSchema = z.enum(commercialStatusValues);
export const recommendationModeSchema = z.enum(recommendationModeValues);
export const serviceLineSchema = z.enum(serviceLineValues);
export const quoteCommandNameSchema = z.enum(quoteCommandNames);

export const quoteCommandEnvelopeSchema = z.object({
  commandId: z.string().uuid(),
  commandName: quoteCommandNameSchema,
  quoteSessionId: z.string().uuid(),
  actor: z.object({
    operatorId: z.string().uuid(),
    role: z.enum(["operator", "admin"]),
  }),
  idempotencyKey: z.string().min(1),
  createdAt: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export type QuoteCommandEnvelope = z.infer<typeof quoteCommandEnvelopeSchema>;

export type QuoteCommandResult = {
  commandId: string;
  quoteSessionId: string;
  sessionStateVersion: number;
  nextAction:
    | "await_operator_input"
    | "await_clarification_answer"
    | "results_ready"
    | "bundle_blocked"
    | "export_ready"
    | "escalation_required";
  viewModelDelta: Record<string, unknown>;
  auditEventIds: string[];
};

const stateTransitions: Record<QuoteSessionState, QuoteSessionState[]> = {
  draft: ["clarifying", "searching", "archived"],
  clarifying: ["clarifying", "searching", "reviewing", "archived"],
  searching: ["clarifying", "reviewing", "escalated", "archived"],
  reviewing: ["searching", "clarifying", "export_ready", "closed", "archived"],
  export_ready: ["exported", "reviewing", "archived"],
  exported: ["reviewing", "closed", "archived"],
  escalated: ["reviewing", "archived"],
  closed: ["archived"],
  archived: ["draft", "reviewing", "searching"],
};

export const canTransitionSessionState = (
  from: QuoteSessionState,
  to: QuoteSessionState,
) => stateTransitions[from].includes(to);

export const getAllowedCommands = (state: QuoteSessionState) => {
  const allowedByState: Record<QuoteSessionState, QuoteCommandName[]> = {
    draft: ["append_operator_message", "archive_quote_session"],
    clarifying: [
      "submit_clarification_answer",
      "append_operator_message",
      "select_option_for_cart",
      "replace_cart_item",
      "remove_cart_item",
      "refresh_bundle_review",
      "archive_quote_session",
    ],
    searching: [
      "request_more_options",
      "apply_requote_change",
      "archive_quote_session",
    ],
    reviewing: [
      "select_option_for_cart",
      "replace_cart_item",
      "remove_cart_item",
      "refresh_bundle_review",
      "apply_requote_change",
      "archive_quote_session",
    ],
    export_ready: [
      "select_option_for_cart",
      "replace_cart_item",
      "remove_cart_item",
      "refresh_bundle_review",
      "generate_quote_pdf",
      "apply_requote_change",
      "archive_quote_session",
    ],
    exported: ["apply_requote_change", "archive_quote_session"],
    escalated: ["append_operator_message", "archive_quote_session"],
    closed: ["archive_quote_session"],
    archived: ["restore_quote_session"],
  };

  return allowedByState[state];
};

export const assertCommandAllowed = (
  state: QuoteSessionState,
  commandName: QuoteCommandName,
) => {
  return getAllowedCommands(state).includes(commandName);
};

export const commercialStatusLabels: Record<CommercialStatus, string> = {
  abierta: "Abierta",
  en_seguimiento: "En seguimiento",
  compartida: "Compartida",
  avanzo_fuera_del_sistema: "Avanzo fuera del sistema",
  cerrada_sin_avance: "Cerrada sin avance",
  archivada: "Archivada",
};

export const quoteStateLabels: Record<QuoteSessionState, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  searching: "Searching",
  reviewing: "Reviewing",
  export_ready: "Export ready",
  exported: "Exported",
  escalated: "Escalated",
  closed: "Closed",
  archived: "Archived",
};
