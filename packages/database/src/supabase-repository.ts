import type {
  AuditEvent,
  BlockingField,
  CommercialStatus,
  NormalizedOption,
  OperatorNote,
  QuoteExport,
  QuoteExportSnapshot,
  QuoteMessage,
  QuoteSession,
  QuoteSessionState,
  QuoteVersion,
  RecommendationMode,
  ServiceLine,
  Shortlist,
  StructuredIntake,
} from "@alana/domain";
import { nowIso } from "@alana/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuoteRecord, QuoteRepository } from "./context-package";
import type { Database, Json } from "./supabase-types";

type QuoteExportSnapshotPayload = Omit<
  QuoteExportSnapshot,
  "createdAt" | "id"
> & {
  kind: "quote_export_snapshot";
};

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

const mapOperatorNoteRow = (
  row: Database["public"]["Tables"]["operator_notes"]["Row"],
): OperatorNote => ({
  content: row.content,
  createdAt: row.created_at,
  id: row.id,
  quoteSessionId: row.quote_session_id,
  updatedAt: row.updated_at,
});

const mapQuoteVersionRow = (
  row: Database["public"]["Tables"]["quote_versions"]["Row"],
): QuoteVersion => ({
  changeReason: row.change_reason,
  coverageState: row.coverage_state as QuoteVersion["coverageState"],
  createdAt: row.created_at,
  diffSummary: row.diff_summary,
  id: row.id,
  payload: row.payload as QuoteVersion["payload"],
  quoteSessionId: row.quote_session_id,
  updatedAt: row.updated_at,
  versionNumber: row.version_number,
  versionState: row.version_state as QuoteVersion["versionState"],
});

const mapQuoteExportSnapshotRow = (
  row: Database["public"]["Tables"]["quote_context_snapshots"]["Row"],
): QuoteExportSnapshot | null => {
  const payload = row.payload as Partial<QuoteExportSnapshotPayload> | null;

  if (payload?.kind !== "quote_export_snapshot") {
    return null;
  }

  return {
    activeQuoteVersion: Number(payload.activeQuoteVersion ?? 0),
    agencyName: String(payload.agencyName ?? ""),
    bundleReview: payload.bundleReview as QuoteExportSnapshot["bundleReview"],
    commercialStatus:
      payload.commercialStatus as QuoteExportSnapshot["commercialStatus"],
    confirmedStateSummary: String(payload.confirmedStateSummary ?? ""),
    createdAt: row.created_at,
    id: row.id,
    quoteSessionId: row.quote_session_id,
    recommendationMode:
      payload.recommendationMode as QuoteExportSnapshot["recommendationMode"],
    selectedItems:
      (payload.selectedItems as QuoteExportSnapshot["selectedItems"]) ?? [],
    status: payload.status as QuoteExportSnapshot["status"],
    summary: row.summary,
    title: String(payload.title ?? ""),
    tripLabel: String(payload.tripLabel ?? ""),
    tripStartDate:
      typeof payload.tripStartDate === "string" ? payload.tripStartDate : null,
  };
};

const mapQuoteExportRow = (
  row: Database["public"]["Tables"]["quote_exports"]["Row"],
): QuoteExport => ({
  activeQuoteVersion: row.active_quote_version,
  createdAt: row.created_at,
  fileName: row.file_name,
  fileSizeBytes: row.file_size_bytes,
  id: row.id,
  mimeType: row.mime_type,
  quoteSessionId: row.quote_session_id,
  snapshotId: row.snapshot_id,
  storageBucket: row.storage_bucket,
  storagePath: row.storage_path,
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

const mapSelectedItemRow = (
  row: Database["public"]["Tables"]["selected_quote_items"]["Row"],
): NormalizedOption => row.option_snapshot as NormalizedOption;

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

const mapSelectedItemInsert = (
  quoteSessionId: string,
  option: NormalizedOption,
): Database["public"]["Tables"]["selected_quote_items"]["Insert"] => ({
  option_snapshot: option as Json,
  quote_session_id: quoteSessionId,
  service_line: option.serviceLine,
  updated_at: nowIso(),
});

const mapOperatorNoteInsert = (
  operatorNote: OperatorNote,
): Database["public"]["Tables"]["operator_notes"]["Insert"] => ({
  content: operatorNote.content,
  created_at: operatorNote.createdAt,
  id: operatorNote.id,
  quote_session_id: operatorNote.quoteSessionId,
  updated_at: operatorNote.updatedAt,
});

const mapQuoteVersionInsert = (
  quoteVersion: QuoteVersion,
): Database["public"]["Tables"]["quote_versions"]["Insert"] => ({
  change_reason: quoteVersion.changeReason,
  coverage_state: quoteVersion.coverageState,
  created_at: quoteVersion.createdAt,
  diff_summary: quoteVersion.diffSummary,
  id: quoteVersion.id,
  payload: quoteVersion.payload as Json,
  quote_session_id: quoteVersion.quoteSessionId,
  updated_at: quoteVersion.updatedAt,
  version_number: quoteVersion.versionNumber,
  version_state: quoteVersion.versionState,
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
  const [
    messagesResult,
    intakeResult,
    operatorNoteResult,
    selectedItemsResult,
    shortlists,
    auditResult,
    quoteVersionsResult,
  ] = await Promise.all([
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
    client
      .from("operator_notes")
      .select("*")
      .eq("quote_session_id", session.id)
      .maybeSingle(),
    client
      .from("selected_quote_items")
      .select("*")
      .eq("quote_session_id", session.id)
      .order("created_at", { ascending: true }),
    getShortlists(client, session.id),
    client
      .from("audit_events")
      .select("*")
      .eq("quote_session_id", session.id)
      .order("created_at", { ascending: true }),
    client
      .from("quote_versions")
      .select("*")
      .eq("quote_session_id", session.id)
      .order("version_number", { ascending: false }),
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

  if (operatorNoteResult.error) {
    throw operatorNoteResult.error;
  }

  if (selectedItemsResult.error) {
    throw selectedItemsResult.error;
  }

  if (quoteVersionsResult.error) {
    throw quoteVersionsResult.error;
  }

  const messageRows = messagesResult.data as
    | Database["public"]["Tables"]["quote_messages"]["Row"][]
    | null;
  const intakeRow = intakeResult.data as
    | Database["public"]["Tables"]["structured_intakes"]["Row"]
    | null;
  const operatorNoteRow = operatorNoteResult.data as
    | Database["public"]["Tables"]["operator_notes"]["Row"]
    | null;
  const selectedItemRows = selectedItemsResult.data as
    | Database["public"]["Tables"]["selected_quote_items"]["Row"][]
    | null;
  const auditRows = auditResult.data as
    | Database["public"]["Tables"]["audit_events"]["Row"][]
    | null;
  const quoteVersionRows = quoteVersionsResult.data as
    | Database["public"]["Tables"]["quote_versions"]["Row"][]
    | null;

  return {
    session,
    messages: (messageRows ?? []).map(mapMessageRow),
    intake: intakeRow ? mapIntakeRow(intakeRow) : null,
    selectedItems: (selectedItemRows ?? []).map(mapSelectedItemRow),
    shortlists,
    auditEvents: (auditRows ?? []).map(mapAuditEventRow),
    operatorNote: operatorNoteRow ? mapOperatorNoteRow(operatorNoteRow) : null,
    quoteVersions: (quoteVersionRows ?? []).map(mapQuoteVersionRow),
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
      selectedItems: [],
      shortlists: [],
      auditEvents: [],
      operatorNote: null,
      quoteVersions: [],
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

    const { error: deleteSelectedItemsError } = await client
      .from("selected_quote_items")
      .delete()
      .eq("quote_session_id", record.session.id);

    if (deleteSelectedItemsError) {
      throw deleteSelectedItemsError;
    }

    if (record.selectedItems.length > 0) {
      const { error: selectedItemsError } = await client
        .from("selected_quote_items")
        .insert(
          record.selectedItems.map((option) =>
            mapSelectedItemInsert(record.session.id, option),
          ),
        );

      if (selectedItemsError) {
        throw selectedItemsError;
      }
    }

    if (record.operatorNote) {
      const { error: operatorNoteError } = await client
        .from("operator_notes")
        .upsert(mapOperatorNoteInsert(record.operatorNote), {
          onConflict: "quote_session_id",
        });

      if (operatorNoteError) {
        throw operatorNoteError;
      }
    } else {
      const { error: deleteOperatorNoteError } = await client
        .from("operator_notes")
        .delete()
        .eq("quote_session_id", record.session.id);

      if (deleteOperatorNoteError) {
        throw deleteOperatorNoteError;
      }
    }

    const { error: deleteQuoteVersionsError } = await client
      .from("quote_versions")
      .delete()
      .eq("quote_session_id", record.session.id);

    if (deleteQuoteVersionsError) {
      throw deleteQuoteVersionsError;
    }

    if (record.quoteVersions.length > 0) {
      const { error: quoteVersionsError } = await client
        .from("quote_versions")
        .insert(record.quoteVersions.map(mapQuoteVersionInsert));

      if (quoteVersionsError) {
        throw quoteVersionsError;
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
  async createQuoteExportSnapshot(snapshot) {
    const { data, error } = await client
      .from("quote_context_snapshots")
      .insert({
        payload: {
          ...snapshot,
          kind: "quote_export_snapshot",
        } as Json,
        quote_session_id: snapshot.quoteSessionId,
        summary: snapshot.summary,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const createdSnapshot = mapQuoteExportSnapshotRow(
      data as Database["public"]["Tables"]["quote_context_snapshots"]["Row"],
    );

    if (!createdSnapshot) {
      throw new Error("quote_export_snapshot_invalid");
    }

    return createdSnapshot;
  },
  async createQuoteExport(quoteExport) {
    const { data, error } = await client
      .from("quote_exports")
      .insert({
        active_quote_version: quoteExport.activeQuoteVersion,
        file_name: quoteExport.fileName,
        file_size_bytes: quoteExport.fileSizeBytes,
        id: quoteExport.id,
        mime_type: quoteExport.mimeType,
        quote_session_id: quoteExport.quoteSessionId,
        snapshot_id: quoteExport.snapshotId,
        storage_bucket: quoteExport.storageBucket,
        storage_path: quoteExport.storagePath,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapQuoteExportRow(
      data as Database["public"]["Tables"]["quote_exports"]["Row"],
    );
  },
  async getQuoteExport(quoteSessionId, exportId) {
    const { data, error } = await client
      .from("quote_exports")
      .select("*")
      .eq("id", exportId)
      .eq("quote_session_id", quoteSessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapQuoteExportRow(
      data as Database["public"]["Tables"]["quote_exports"]["Row"],
    );
  },
  async getQuoteExportSnapshot(quoteSessionId, snapshotId) {
    const { data, error } = await client
      .from("quote_context_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .eq("quote_session_id", quoteSessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapQuoteExportSnapshotRow(
      data as Database["public"]["Tables"]["quote_context_snapshots"]["Row"],
    );
  },
});
