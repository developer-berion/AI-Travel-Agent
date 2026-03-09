import type {
  AuditEvent,
  BlockingField,
  CommercialStatus,
  NormalizedOption,
  QuoteMessage,
  QuoteSession,
  QuoteSessionState,
  RecommendationMode,
  ServiceLine,
  Shortlist,
  StructuredIntake,
} from "@alana/domain";
import { nowIso } from "@alana/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuoteRecord, QuoteRepository } from "./context-package";
import type { Database, Json } from "./supabase-types";

const mapSessionRow = (
  row: Database["public"]["Tables"]["quote_sessions"]["Row"],
): QuoteSession => ({
  id: row.id,
  operatorId: row.operator_id,
  title: row.title,
  agencyName: row.agency_name,
  tripLabel: row.trip_label,
  tripStartDate: row.trip_start_date,
  status: row.status as QuoteSessionState,
  commercialStatus: row.commercial_status as CommercialStatus,
  recommendationMode: row.recommendation_mode as RecommendationMode,
  activeQuoteVersion: row.active_quote_version,
  latestContextSummary: row.latest_context_summary,
  pendingQuestion: row.pending_question,
  lastActivityAt: row.updated_at,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapSessionInsert = (
  session: QuoteSession,
): Database["public"]["Tables"]["quote_sessions"]["Insert"] => ({
  id: session.id,
  operator_id: session.operatorId,
  title: session.title,
  agency_name: session.agencyName,
  trip_label: session.tripLabel,
  trip_start_date: session.tripStartDate,
  status: session.status,
  commercial_status: session.commercialStatus,
  recommendation_mode: session.recommendationMode,
  active_quote_version: session.activeQuoteVersion,
  latest_context_summary: session.latestContextSummary,
  pending_question: session.pendingQuestion,
  archived_at: session.archivedAt,
  created_at: session.createdAt,
  updated_at: session.updatedAt,
});

const mapMessageRow = (
  row: Database["public"]["Tables"]["quote_messages"]["Row"],
): QuoteMessage => ({
  id: row.id,
  quoteSessionId: row.quote_session_id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
});

const mapAuditEventRow = (
  row: Database["public"]["Tables"]["audit_events"]["Row"],
): AuditEvent => ({
  id: row.id,
  quoteSessionId: row.quote_session_id,
  eventName: row.event_name as AuditEvent["eventName"],
  payload: row.payload as AuditEvent["payload"],
  createdAt: row.created_at,
});

const mapOptionRow = (
  row: Database["public"]["Tables"]["normalized_options"]["Row"],
): NormalizedOption => ({
  id: row.id,
  serviceLine: row.service_line as ServiceLine,
  title: row.title,
  destination: row.destination,
  headlinePrice: Number(row.headline_price),
  currency: row.currency,
  whyItFits: row.why_it_fits,
  tradeoff: row.tradeoff,
  caveat: row.caveat,
  availabilityState:
    row.availability_state as NormalizedOption["availabilityState"],
  supplierMetadata:
    row.supplier_metadata as NormalizedOption["supplierMetadata"],
});

const mapIntakeRow = (
  row: Database["public"]["Tables"]["structured_intakes"]["Row"],
): StructuredIntake => ({
  id: row.id,
  quoteSessionId: row.quote_session_id,
  requestedServiceLines: row.requested_service_lines as ServiceLine[],
  extractedFields: row.extracted_fields as StructuredIntake["extractedFields"],
  missingFields: row.missing_fields as BlockingField[],
  contradictions: row.contradictions as string[],
  readinessByServiceLine:
    row.readiness_snapshot as StructuredIntake["readinessByServiceLine"],
  createdAt: row.created_at,
});

const mapIntakeInsert = (
  intake: StructuredIntake,
): Database["public"]["Tables"]["structured_intakes"]["Insert"] => ({
  id: intake.id,
  quote_session_id: intake.quoteSessionId,
  requested_service_lines: intake.requestedServiceLines as Json,
  extracted_fields: intake.extractedFields as Json,
  missing_fields: intake.missingFields as Json,
  contradictions: intake.contradictions as Json,
  readiness_snapshot: intake.readinessByServiceLine as Json,
  created_at: intake.createdAt,
});

const mapShortlistInsert = (
  shortlist: Shortlist,
): Database["public"]["Tables"]["shortlists"]["Insert"] => ({
  id: shortlist.id,
  quote_session_id: shortlist.quoteSessionId,
  service_line: shortlist.serviceLine,
  weak_shortlist: shortlist.weakShortlist,
  reason: shortlist.reason,
});

const mapOptionInsert = (
  shortlistId: string,
  option: NormalizedOption,
): Database["public"]["Tables"]["normalized_options"]["Insert"] => ({
  id: option.id,
  shortlist_id: shortlistId,
  service_line: option.serviceLine,
  title: option.title,
  destination: option.destination,
  headline_price: option.headlinePrice,
  currency: option.currency,
  why_it_fits: option.whyItFits,
  tradeoff: option.tradeoff,
  caveat: option.caveat,
  availability_state: option.availabilityState,
  supplier_metadata: option.supplierMetadata as Json,
});

const getShortlists = async (
  client: SupabaseClient<Database>,
  quoteSessionId: string,
) => {
  const { data: shortlistData, error: shortlistError } = await client
    .from("shortlists")
    .select("*")
    .eq("quote_session_id", quoteSessionId)
    .order("created_at", { ascending: true });

  if (shortlistError) {
    throw shortlistError;
  }

  const shortlistRows = shortlistData as
    | Database["public"]["Tables"]["shortlists"]["Row"][]
    | null;
  const shortlistIds = (shortlistRows ?? []).map((row) => row.id);

  const { data: optionData, error: optionError } = shortlistIds.length
    ? await client
        .from("normalized_options")
        .select("*")
        .in("shortlist_id", shortlistIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (optionError) {
    throw optionError;
  }

  const optionRows = optionData as
    | Database["public"]["Tables"]["normalized_options"]["Row"][]
    | null;
  const optionsByShortlist = new Map<string, NormalizedOption[]>();

  for (const optionRow of optionRows ?? []) {
    const options = optionsByShortlist.get(optionRow.shortlist_id) ?? [];
    options.push(mapOptionRow(optionRow));
    optionsByShortlist.set(optionRow.shortlist_id, options);
  }

  return (shortlistRows ?? []).map<Shortlist>((row) => ({
    id: row.id,
    quoteSessionId: row.quote_session_id,
    serviceLine: row.service_line as ServiceLine,
    items: optionsByShortlist.get(row.id) ?? [],
    weakShortlist: row.weak_shortlist,
    reason: row.reason,
  }));
};

const mapPersistedRecord = async (
  client: SupabaseClient<Database>,
  sessionRow: Database["public"]["Tables"]["quote_sessions"]["Row"],
) => {
  const session = mapSessionRow(sessionRow);
  const [messagesResult, intakeResult, shortlists, auditResult] =
    await Promise.all([
      client
        .from("quote_messages")
        .select("*")
        .eq("quote_session_id", session.id)
        .order("created_at", { ascending: true }),
      client
        .from("structured_intakes")
        .select("*")
        .eq("quote_session_id", session.id)
        .maybeSingle(),
      getShortlists(client, session.id),
      client
        .from("audit_events")
        .select("*")
        .eq("quote_session_id", session.id)
        .order("created_at", { ascending: true }),
    ]);

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  if (intakeResult.error) {
    throw intakeResult.error;
  }

  if (auditResult.error) {
    throw auditResult.error;
  }

  const messageRows = messagesResult.data as
    | Database["public"]["Tables"]["quote_messages"]["Row"][]
    | null;
  const intakeRow = intakeResult.data as
    | Database["public"]["Tables"]["structured_intakes"]["Row"]
    | null;
  const auditRows = auditResult.data as
    | Database["public"]["Tables"]["audit_events"]["Row"][]
    | null;

  return {
    session,
    messages: (messageRows ?? []).map(mapMessageRow),
    intake: intakeRow ? mapIntakeRow(intakeRow) : null,
    shortlists,
    auditEvents: (auditRows ?? []).map(mapAuditEventRow),
  } satisfies QuoteRecord;
};

export const createSupabaseQuoteRepository = (
  client: SupabaseClient<Database>,
): QuoteRepository => ({
  async createSession(input) {
    const timestamp = nowIso();
    const { data, error } = await client
      .from("quote_sessions")
      .insert({
        operator_id: input.operatorId,
        title: input.title,
        agency_name: input.agencyName,
        trip_label: "Pending destination",
        trip_start_date: null,
        status: "draft",
        commercial_status: "abierta",
        recommendation_mode: "best_match",
        active_quote_version: 0,
        latest_context_summary: "Nueva cotizacion lista para intake.",
        pending_question:
          "Comparte el pedido del viajero para iniciar la cotizacion.",
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return {
      session: mapSessionRow(
        data as Database["public"]["Tables"]["quote_sessions"]["Row"],
      ),
      messages: [],
      intake: null,
      shortlists: [],
      auditEvents: [],
    };
  },
  async listSessions(operatorId) {
    const { data, error } = await client
      .from("quote_sessions")
      .select("*")
      .eq("operator_id", operatorId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const sessionRows = data as
      | Database["public"]["Tables"]["quote_sessions"]["Row"][]
      | null;

    return (sessionRows ?? []).map(mapSessionRow);
  },
  async getRecord(quoteSessionId) {
    const { data, error } = await client
      .from("quote_sessions")
      .select("*")
      .eq("id", quoteSessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapPersistedRecord(
      client,
      data as Database["public"]["Tables"]["quote_sessions"]["Row"],
    );
  },
  async saveRecord(record) {
    const { data, error } = await client
      .from("quote_sessions")
      .upsert(mapSessionInsert(record.session))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (record.intake) {
      const { error: intakeError } = await client
        .from("structured_intakes")
        .upsert(mapIntakeInsert(record.intake), {
          onConflict: "quote_session_id",
        });

      if (intakeError) {
        throw intakeError;
      }
    } else {
      const { error: deleteIntakeError } = await client
        .from("structured_intakes")
        .delete()
        .eq("quote_session_id", record.session.id);

      if (deleteIntakeError) {
        throw deleteIntakeError;
      }
    }

    const { error: deleteShortlistsError } = await client
      .from("shortlists")
      .delete()
      .eq("quote_session_id", record.session.id);

    if (deleteShortlistsError) {
      throw deleteShortlistsError;
    }

    if (record.shortlists.length > 0) {
      const { error: shortlistError } = await client
        .from("shortlists")
        .insert(record.shortlists.map(mapShortlistInsert));

      if (shortlistError) {
        throw shortlistError;
      }

      const optionRows = record.shortlists.flatMap((shortlist) =>
        shortlist.items.map((option) => mapOptionInsert(shortlist.id, option)),
      );

      if (optionRows.length > 0) {
        const { error: optionError } = await client
          .from("normalized_options")
          .insert(optionRows);

        if (optionError) {
          throw optionError;
        }
      }
    }

    return mapPersistedRecord(
      client,
      data as Database["public"]["Tables"]["quote_sessions"]["Row"],
    );
  },
  async appendMessage(message) {
    const createdAt = nowIso();
    const { data, error } = await client
      .from("quote_messages")
      .insert({
        quote_session_id: message.quoteSessionId,
        role: message.role,
        content: message.content,
        created_at: createdAt,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapMessageRow(
      data as Database["public"]["Tables"]["quote_messages"]["Row"],
    );
  },
  async appendAuditEvent(event) {
    const { data, error } = await client
      .from("audit_events")
      .insert({
        quote_session_id: event.quoteSessionId,
        event_name: event.eventName,
        payload: event.payload as Json,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapAuditEventRow(
      data as Database["public"]["Tables"]["audit_events"]["Row"],
    );
  },
});
