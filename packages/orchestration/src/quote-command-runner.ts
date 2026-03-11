import {
  type QuoteRecord,
  type QuoteRepository,
  buildActiveQuoteView,
  buildBundleReviewView,
  buildCaseSheetView,
  buildContextPackage,
  buildConversationTimelineView,
  buildQuoteExportSnapshot,
  buildQuoteVersionDiffView,
  buildQuoteVersionSummaries,
  buildResumeSnapshotView,
  buildWorkspaceCaseSummary,
  getCoverageState,
  updateSessionMeta,
} from "@alana/database";
import {
  type NormalizedOption,
  type QuoteCommandEnvelope,
  type QuoteCommandResult,
  type QuoteExport,
  type QuoteExportSnapshot,
  type ServiceLine,
  assertCommandAllowed,
  commercialStatusSchema,
  recommendationModeSchema,
  serviceLineSchema,
} from "@alana/domain";
import type { HotelbedsSearchAdapter } from "@alana/hotelbeds";
import {
  createMockHotelbedsAdapter,
  enrichStructuredIntakeWithHotelbedsAnchors,
  resolveTransferPropertyAnchor,
} from "@alana/hotelbeds";
import { createId, nowIso } from "@alana/shared";

import {
  type QuoteAiRuntime,
  createMockAiRuntime,
  createStructuredIntake,
  getClarificationQuestion,
} from "./ai-runtime";

const buildAssistantSummary = (record: QuoteRecord) => {
  if (record.shortlists.length === 0) {
    return "El caso sigue en intake y clarificacion.";
  }

  const serviceLabels = record.shortlists
    .map((shortlist) => shortlist.serviceLine)
    .join(", ");

  return `La cotizacion ya tiene opciones preliminares para ${serviceLabels}.`;
};

const getPreviousOpenAiResponseId = (record: QuoteRecord) => {
  const intakeAudit = [...record.auditEvents]
    .reverse()
    .find(
      (event) =>
        event.eventName === "intake_extracted" &&
        typeof event.payload.openai_response_id === "string",
    );

  return typeof intakeAudit?.payload.openai_response_id === "string"
    ? intakeAudit.payload.openai_response_id
    : null;
};

const getServiceLineReadinessNote = (
  extractionFields: Record<string, unknown>,
  serviceLine: ServiceLine,
) => {
  const note = extractionFields[`${serviceLine}ReadinessNote`];
  return typeof note === "string" && note.trim().length > 0
    ? note.trim()
    : null;
};

const getTripStartDate = (extractedFields: Record<string, unknown>) => {
  if (!Array.isArray(extractedFields.travelDates)) {
    return null;
  }

  for (const value of extractedFields.travelDates) {
    if (typeof value !== "string") {
      continue;
    }

    const match = value.match(/\b\d{4}-\d{2}-\d{2}\b/);

    if (match) {
      return match[0];
    }
  }

  return null;
};

const getSupplierAnchorQuestion = (record: QuoteRecord) => {
  const intake = record.intake;

  if (!intake) {
    return "Necesito una aclaracion breve antes de continuar.";
  }

  const blockedServiceLine = intake.requestedServiceLines.find(
    (serviceLine) => intake.readinessByServiceLine[serviceLine] === "blocked",
  );

  if (!blockedServiceLine) {
    return "Necesito una aclaracion breve antes de continuar.";
  }

  const readinessNote = getServiceLineReadinessNote(
    intake.extractedFields,
    blockedServiceLine,
  );

  if (blockedServiceLine === "transfer") {
    return (
      readinessNote ??
      "Necesito pickup y dropoff exactos para el transfer antes de consultar Hotelbeds."
    );
  }

  if (blockedServiceLine === "hotel") {
    return (
      readinessNote ??
      "Necesito un destino soportado para poder mapear la busqueda hotelera."
    );
  }

  return (
    readinessNote ??
    "Necesito un destino soportado para poder mapear la busqueda de actividades."
  );
};

const findShortlistOption = (record: QuoteRecord, optionId: string) =>
  record.shortlists
    .flatMap((shortlist) => shortlist.items)
    .find((option) => option.id === optionId);

const getSupplierMetadataString = (option: NormalizedOption, key: string) => {
  const value = option.supplierMetadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const buildShortlistFromSearchResult = (
  quoteSessionId: string,
  result: Awaited<ReturnType<HotelbedsSearchAdapter["search"]>>,
) => ({
  id: createId(),
  items: result.options,
  quoteSessionId,
  reason: result.warning ?? result.error?.message ?? null,
  serviceLine: result.serviceLine,
  weakShortlist: result.weakShortlist,
});

const upsertShortlist = (
  record: QuoteRecord,
  shortlist: ReturnType<typeof buildShortlistFromSearchResult>,
) => {
  record.shortlists = [
    ...record.shortlists.filter(
      (candidate) => candidate.serviceLine !== shortlist.serviceLine,
    ),
    shortlist,
  ];
};

const syncSelectedHotelIntoIntake = (
  intake: QuoteRecord["intake"],
  selectedOption: NormalizedOption,
) => {
  if (!intake || selectedOption.serviceLine !== "hotel") {
    return intake;
  }

  const {
    transferFromCode: _transferFromCode,
    transferFromLabel: _transferFromLabel,
    transferFromType: _transferFromType,
    transferPropertyCode: _transferPropertyCode,
    transferPropertyLabel: _transferPropertyLabel,
    transferPropertyType: _transferPropertyType,
    transferToCode: _transferToCode,
    transferToLabel: _transferToLabel,
    transferToType: _transferToType,
    ...remainingFields
  } = intake.extractedFields;
  const nextFields = {
    ...remainingFields,
  };
  const directTransferPropertyCode = getSupplierMetadataString(
    selectedOption,
    "transferPropertyCode",
  );
  const directTransferPropertyType = getSupplierMetadataString(
    selectedOption,
    "transferPropertyType",
  );
  const directTransferProperty =
    directTransferPropertyCode && directTransferPropertyType
      ? {
          code: directTransferPropertyCode,
          label:
            getSupplierMetadataString(
              selectedOption,
              "transferPropertyLabel",
            ) ?? selectedOption.title,
          type: directTransferPropertyType,
        }
      : null;
  const resolvedTransferProperty =
    directTransferProperty ??
    resolveTransferPropertyAnchor({
      destination: selectedOption.destination,
      hotelCode: getSupplierMetadataString(selectedOption, "hotelCode"),
      hotelName: selectedOption.title,
    });

  nextFields.selectedHotelTitle = selectedOption.title;
  nextFields.selectedHotelCode =
    getSupplierMetadataString(selectedOption, "hotelCode") ?? "";

  if (resolvedTransferProperty) {
    nextFields.transferPropertyCode = resolvedTransferProperty.code;
    nextFields.transferPropertyLabel = resolvedTransferProperty.label;
    nextFields.transferPropertyType = resolvedTransferProperty.type;
  }

  return enrichStructuredIntakeWithHotelbedsAnchors({
    ...intake,
    extractedFields: nextFields,
  });
};

const buildBundleSummary = (record: QuoteRecord) => {
  const bundleReview = buildBundleReviewView(record);
  const intake = record.intake;
  const hasBlockedServiceLine = intake
    ? intake.requestedServiceLines.some(
        (serviceLine) =>
          intake.readinessByServiceLine[serviceLine] === "blocked",
      )
    : false;

  if (!bundleReview) {
    return {
      bundleReview: null,
      nextAction: hasBlockedServiceLine
        ? ("await_clarification_answer" as const)
        : ("bundle_blocked" as const),
      targetState: hasBlockedServiceLine
        ? ("clarifying" as const)
        : ("reviewing" as const),
      summary: "Todavia no existe una seleccion para bundle review.",
    };
  }

  if (bundleReview.isExportReady) {
    return {
      bundleReview,
      nextAction: "export_ready" as const,
      targetState: "export_ready" as const,
      summary: `Bundle review listo con ${bundleReview.selectedItems.length} item(s) seleccionados.`,
    };
  }

  if (hasBlockedServiceLine) {
    return {
      bundleReview,
      nextAction: "await_clarification_answer" as const,
      targetState: "clarifying" as const,
      summary:
        bundleReview.blockers[0] ??
        "El bundle sigue bloqueado porque todavia falta resolver un servicio.",
    };
  }

  return {
    bundleReview,
    nextAction: "bundle_blocked" as const,
    targetState: "reviewing" as const,
    summary:
      bundleReview.blockers[0] ??
      "El bundle review sigue en revision y necesita mas selecciones.",
  };
};

const sanitizeFileNameSegment = (value: string) => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length > 0 ? sanitized : "quote";
};

const buildQuotePdfFileName = (snapshot: QuoteExportSnapshot) =>
  `${sanitizeFileNameSegment(snapshot.tripLabel || snapshot.title)}-v${snapshot.activeQuoteVersion}.pdf`;

const buildViewModelDelta = (
  record: QuoteRecord,
  extra: Record<string, unknown> = {},
) => ({
  activeQuoteView: buildActiveQuoteView(record),
  bundleReview: buildBundleReviewView(record),
  caseSheet: buildCaseSheetView(record),
  conversationTimeline: buildConversationTimelineView(record),
  contextPackage: buildContextPackage(record),
  resumeSnapshot: buildResumeSnapshotView(record),
  quoteVersionDiffs: record.quoteVersions
    .map((version) => buildQuoteVersionDiffView(record, version.id))
    .filter((diff): diff is NonNullable<typeof diff> => diff !== null),
  quoteVersions: buildQuoteVersionSummaries(record),
  workspaceCase: buildWorkspaceCaseSummary(record),
  ...extra,
});

const getNextActionForRecord = (
  record: QuoteRecord,
): QuoteCommandResult["nextAction"] => {
  if (record.session.status === "clarifying") {
    return "await_clarification_answer";
  }

  if (record.session.status === "export_ready") {
    return "export_ready";
  }

  if (
    record.session.status === "reviewing" ||
    record.session.status === "exported"
  ) {
    return record.selectedItems.length > 0 ? "results_ready" : "bundle_blocked";
  }

  return "await_operator_input";
};

const buildQuoteVersionPayload = (record: QuoteRecord) => ({
  bundleReview: buildBundleReviewView(record),
  commercialStatus: record.session.commercialStatus,
  confirmedStateSummary: record.session.latestContextSummary,
  intake: record.intake,
  pendingQuestion: record.session.pendingQuestion,
  recommendationMode: record.session.recommendationMode,
  selectedItems: record.selectedItems,
  shortlists: record.shortlists,
  title: record.session.title,
  tripLabel: record.session.tripLabel,
  tripStartDate: record.session.tripStartDate,
});

const syncQuoteVersionRecord = (
  record: QuoteRecord,
  input: {
    changeReason: string;
    diffSummary?: string | null;
  },
) => {
  if (record.session.activeQuoteVersion <= 0) {
    return null;
  }

  const timestamp = nowIso();
  const coverageState = getCoverageState(record);
  const existingVersion = record.quoteVersions.find(
    (version) => version.versionNumber === record.session.activeQuoteVersion,
  );
  const nextVersion = existingVersion
    ? {
        ...existingVersion,
        changeReason: input.changeReason,
        coverageState,
        diffSummary: input.diffSummary ?? existingVersion.diffSummary,
        payload: buildQuoteVersionPayload(record),
        updatedAt: timestamp,
        versionState: "active" as const,
      }
    : {
        id: createId(),
        quoteSessionId: record.session.id,
        versionNumber: record.session.activeQuoteVersion,
        versionState: "active" as const,
        coverageState,
        changeReason: input.changeReason,
        diffSummary: input.diffSummary ?? null,
        payload: buildQuoteVersionPayload(record),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

  record.quoteVersions = [
    ...record.quoteVersions
      .filter(
        (version) =>
          version.versionNumber !== record.session.activeQuoteVersion,
      )
      .map((version) => ({
        ...version,
        versionState: "superseded" as const,
      })),
    nextVersion,
  ].sort((left, right) => right.versionNumber - left.versionNumber);

  return nextVersion;
};

const restoreVersionPayload = (record: QuoteRecord, versionId: string) => {
  const version = record.quoteVersions.find(
    (candidate) => candidate.id === versionId,
  );

  if (!version) {
    throw new Error("quote_version_not_found");
  }

  const payload = version.payload;
  const selectedItems = Array.isArray(payload.selectedItems)
    ? (payload.selectedItems as NormalizedOption[])
    : [];
  const shortlists = Array.isArray(payload.shortlists)
    ? (payload.shortlists as QuoteRecord["shortlists"])
    : [];
  const intake =
    payload.intake && typeof payload.intake === "object"
      ? (payload.intake as QuoteRecord["intake"])
      : record.intake;
  const summary =
    typeof payload.confirmedStateSummary === "string"
      ? payload.confirmedStateSummary
      : record.session.latestContextSummary;

  record.selectedItems = selectedItems;
  record.shortlists = shortlists;
  record.intake = intake;

  return {
    summary,
    version,
  };
};

export type QuotePdfRenderer = {
  render(snapshot: QuoteExportSnapshot): Promise<Uint8Array> | Uint8Array;
};

export type QuoteExportStorageWriter = {
  storeFile(input: {
    bytes: Uint8Array;
    exportId: string;
    fileName: string;
    mimeType: string;
    quoteSessionId: string;
  }):
    | Promise<
        Pick<
          QuoteExport,
          | "fileName"
          | "fileSizeBytes"
          | "mimeType"
          | "storageBucket"
          | "storagePath"
        >
      >
    | Pick<
        QuoteExport,
        | "fileName"
        | "fileSizeBytes"
        | "mimeType"
        | "storageBucket"
        | "storagePath"
      >;
};

const createFallbackQuotePdfRenderer = (): QuotePdfRenderer => ({
  render(snapshot) {
    return new TextEncoder().encode(
      `%PDF-1.4\n% Alana mock export\n${snapshot.summary}\n`,
    );
  },
});

const createFallbackQuoteExportStorage = (): QuoteExportStorageWriter => ({
  storeFile(input) {
    return {
      fileName: input.fileName,
      fileSizeBytes: input.bytes.byteLength,
      mimeType: input.mimeType,
      storageBucket: "quote-exports",
      storagePath: `quote-sessions/${input.quoteSessionId}/exports/${input.exportId}/${input.fileName}`,
    };
  },
});

export const createQuoteCommandRunner = (dependencies?: {
  aiRuntime?: QuoteAiRuntime;
  hotelbedsAdapter?: HotelbedsSearchAdapter;
  quoteExportStorage?: QuoteExportStorageWriter;
  quotePdfRenderer?: QuotePdfRenderer;
}) => {
  const aiRuntime = dependencies?.aiRuntime ?? createMockAiRuntime();
  const hotelbedsAdapter =
    dependencies?.hotelbedsAdapter ?? createMockHotelbedsAdapter();
  const quotePdfRenderer =
    dependencies?.quotePdfRenderer ?? createFallbackQuotePdfRenderer();
  const quoteExportStorage =
    dependencies?.quoteExportStorage ?? createFallbackQuoteExportStorage();

  return async (
    repository: QuoteRepository,
    envelope: QuoteCommandEnvelope,
  ): Promise<QuoteCommandResult> => {
    let record = await repository.getRecord(envelope.quoteSessionId);

    if (!record) {
      throw new Error("quote_session_not_found");
    }

    const quoteSessionId = record.session.id;

    if (!assertCommandAllowed(record.session.status, envelope.commandName)) {
      throw new Error("quote_command_not_allowed");
    }

    const auditEventIds: string[] = [];

    const pushAudit = async (
      eventName: Parameters<
        QuoteRepository["appendAuditEvent"]
      >[0]["eventName"],
      payload: Record<string, string | number | boolean | null>,
    ) => {
      const event = await repository.appendAuditEvent({
        quoteSessionId,
        eventName,
        payload,
      });
      auditEventIds.push(event.id);
    };

    if (
      envelope.commandName === "append_operator_message" ||
      envelope.commandName === "submit_clarification_answer" ||
      (envelope.commandName === "apply_requote_change" &&
        typeof envelope.payload.versionId !== "string")
    ) {
      const content = String(envelope.payload.content ?? "");
      const previousResponseId =
        envelope.commandName === "submit_clarification_answer"
          ? getPreviousOpenAiResponseId(record)
          : null;

      await repository.appendMessage({
        quoteSessionId: record.session.id,
        role: "operator",
        content,
      });

      await pushAudit(
        envelope.commandName === "append_operator_message"
          ? "operator_message_appended"
          : envelope.commandName === "submit_clarification_answer"
            ? "clarification_answer_recorded"
            : "requote_change_applied",
        { contentLength: content.length },
      );

      const extraction = await aiRuntime.extractStructuredIntake({
        content,
        existingIntake: record.intake,
        previousResponseId,
        quoteSessionId: record.session.id,
      });
      const intake = enrichStructuredIntakeWithHotelbedsAnchors(
        createStructuredIntake(record.session.id, extraction),
      );
      record.intake = intake;
      await pushAudit("intake_extracted", {
        blockers: intake.missingFields.length,
        contradictions: intake.contradictions.length,
        openai_response_id: extraction.previousResponseId,
      });

      if (intake.missingFields.length > 0) {
        record.shortlists = [];
        record.selectedItems = [];
        record.session = updateSessionMeta(record.session, {
          latestContextSummary:
            "El caso necesita clarificacion minima antes de buscar.",
          pendingQuestion: getClarificationQuestion(intake),
          status: "clarifying",
          tripLabel:
            typeof intake.extractedFields.destination === "string" &&
            intake.extractedFields.destination.length > 0
              ? `Trip to ${String(intake.extractedFields.destination)}`
              : record.session.tripLabel,
          tripStartDate: getTripStartDate(intake.extractedFields),
        });
        await repository.saveRecord(record);
        await pushAudit("readiness_validated", {
          blockerCount: intake.missingFields.length,
          ready: false,
        });

        return {
          auditEventIds,
          commandId: envelope.commandId,
          nextAction: "await_clarification_answer",
          quoteSessionId: record.session.id,
          sessionStateVersion: record.session.activeQuoteVersion,
          viewModelDelta: buildViewModelDelta(record, {
            blockers: intake.missingFields,
            question: record.session.pendingQuestion,
          }),
        };
      }

      const readyServiceLines = intake.requestedServiceLines.filter(
        (serviceLine) => intake.readinessByServiceLine[serviceLine] === "ready",
      );
      const blockedServiceLines = intake.requestedServiceLines.filter(
        (serviceLine) =>
          intake.readinessByServiceLine[serviceLine] === "blocked",
      );

      if (readyServiceLines.length === 0) {
        record.shortlists = [];
        record.selectedItems = [];
        record.session = updateSessionMeta(record.session, {
          latestContextSummary:
            "Necesito anchors supplier-ready antes de ejecutar la cotizacion.",
          pendingQuestion: getSupplierAnchorQuestion(record),
          status: "clarifying",
          tripLabel: `Trip to ${String(intake.extractedFields.destination)}`,
          tripStartDate: getTripStartDate(intake.extractedFields),
        });
        await repository.saveRecord(record);
        await pushAudit("readiness_validated", {
          blockerCount: blockedServiceLines.length,
          ready: false,
        });
        await pushAudit("fallback_triggered", {
          blockedServices: blockedServiceLines.join(","),
          reason: "supplier_anchor_resolution",
        });

        return {
          auditEventIds,
          commandId: envelope.commandId,
          nextAction: "await_clarification_answer",
          quoteSessionId: record.session.id,
          sessionStateVersion: record.session.activeQuoteVersion,
          viewModelDelta: buildViewModelDelta(record, {
            blockers: blockedServiceLines,
            question: record.session.pendingQuestion,
          }),
        };
      }

      record.session = updateSessionMeta(record.session, {
        latestContextSummary: "Readiness valida. Ejecutando supplier searches.",
        pendingQuestion: null,
        status: "searching",
        tripLabel: `Trip to ${String(intake.extractedFields.destination)}`,
        tripStartDate: getTripStartDate(intake.extractedFields),
      });
      await pushAudit("readiness_validated", { blockerCount: 0, ready: true });

      const results = await Promise.all(
        readyServiceLines.map((serviceLine) =>
          hotelbedsAdapter.search(intake, serviceLine),
        ),
      );

      record.selectedItems = [];
      record.shortlists = results.map((result) =>
        buildShortlistFromSearchResult(quoteSessionId, result),
      );

      const hasWeakShortlist = results.some((result) => result.weakShortlist);
      const hasNoResults = results.some(
        (result) => result.error?.code === "no_results",
      );
      const hasBlockedServices = blockedServiceLines.length > 0;

      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: record.session.activeQuoteVersion + 1,
        latestContextSummary: hasBlockedServices
          ? `La cotizacion es parcial; falta resolver ${blockedServiceLines.join(", ")} con anchors supplier-ready.`
          : hasWeakShortlist
            ? "La cotizacion es parcial o debil y requiere caveats visibles."
            : hasNoResults
              ? "Una capa no devolvio resultados; se requiere fallback honesto."
              : "La cotizacion ya tiene shortlist util para revision operator-facing.",
        pendingQuestion: hasBlockedServices
          ? getSupplierAnchorQuestion(record)
          : null,
        status: hasBlockedServices ? "clarifying" : "reviewing",
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason:
          envelope.commandName === "apply_requote_change"
            ? "Requote aplicado desde el hilo"
            : "Nueva version generada desde intake",
        diffSummary: hasBlockedServices
          ? "La nueva version quedo parcial por coverage pendiente."
          : "La nueva version refresco la shortlist activa.",
      });

      await pushAudit("search_execution_completed", {
        services: readyServiceLines.length,
        weakShortlist: hasWeakShortlist,
      });
      if (hasBlockedServices) {
        await pushAudit("fallback_triggered", {
          blockedServices: blockedServiceLines.join(","),
          readyServices: readyServiceLines.join(","),
          reason: "supplier_anchor_resolution",
        });
      }
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }
      await pushAudit("shortlist_created", {
        shortlistCount: record.shortlists.length,
      });
      await pushAudit("state_transition_recorded", {
        targetState: record.session.status,
      });

      await repository.appendMessage({
        quoteSessionId: record.session.id,
        role: "assistant",
        content: hasBlockedServices
          ? `Ya tengo opciones para ${readyServiceLines.join(", ")}, pero ${blockedServiceLines.join(", ")} sigue esperando anchors exactos.`
          : hasWeakShortlist
            ? "Encontre una salida util, pero una capa necesita caveats visibles o seguimiento."
            : "Ya tengo una shortlist inicial y la deje lista para revision.",
      });

      await repository.saveRecord(record);

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: hasBlockedServices
          ? "await_clarification_answer"
          : "results_ready",
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record, {
          shortlists: record.shortlists,
          summary: buildAssistantSummary(record),
        }),
      };
    }

    if (
      envelope.commandName === "apply_requote_change" &&
      typeof envelope.payload.versionId === "string"
    ) {
      const { summary, version } = restoreVersionPayload(
        record,
        String(envelope.payload.versionId),
      );
      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: record.session.activeQuoteVersion + 1,
        latestContextSummary: `Se reutilizo la v${version.versionNumber} como nueva base activa. ${summary}`,
        pendingQuestion: null,
        status: record.selectedItems.length > 0 ? "reviewing" : "clarifying",
      });
      const bundleSummary = buildBundleSummary(record);
      record.session = updateSessionMeta(record.session, {
        latestContextSummary: bundleSummary.summary,
        pendingQuestion:
          bundleSummary.targetState === "clarifying"
            ? getSupplierAnchorQuestion(record)
            : null,
        status: bundleSummary.targetState,
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason: `Nueva base creada desde la v${version.versionNumber}`,
        diffSummary: "Se recupero una version anterior como punto de partida.",
      });

      await repository.saveRecord(record);
      await pushAudit("requote_change_applied", {
        sourceVersion: version.versionNumber,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: getNextActionForRecord(record),
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record),
      };
    }

    if (
      envelope.commandName === "select_option_for_cart" ||
      envelope.commandName === "replace_cart_item"
    ) {
      const optionId = String(envelope.payload.optionId ?? "");
      const selectedOption = findShortlistOption(record, optionId);

      if (!selectedOption) {
        throw new Error("quote_option_not_found");
      }

      const previousSelection = record.selectedItems.find(
        (item) => item.serviceLine === selectedOption.serviceLine,
      );
      const hasSelectionChanged = previousSelection?.id !== selectedOption.id;

      record.selectedItems = [
        ...record.selectedItems.filter(
          (item) => item.serviceLine !== selectedOption.serviceLine,
        ),
        selectedOption,
      ];

      if (
        selectedOption.serviceLine === "hotel" &&
        record.intake?.requestedServiceLines.includes("transfer")
      ) {
        const nextIntake = syncSelectedHotelIntoIntake(
          record.intake,
          selectedOption,
        );
        const blockedServiceLinesAfterSelection =
          nextIntake?.requestedServiceLines.filter(
            (serviceLine) =>
              nextIntake.readinessByServiceLine[serviceLine] === "blocked",
          ) ?? [];
        const nextTransferReadiness =
          nextIntake?.readinessByServiceLine.transfer;
        const transferReady = Boolean(
          nextIntake?.requestedServiceLines.includes("transfer") &&
            nextTransferReadiness === "ready",
        );
        const shouldRefreshTransfer =
          transferReady &&
          (hasSelectionChanged ||
            !record.shortlists.some(
              (shortlist) => shortlist.serviceLine === "transfer",
            ));

        record.intake = nextIntake;

        if (hasSelectionChanged) {
          record.selectedItems = record.selectedItems.filter(
            (item) => item.serviceLine !== "transfer",
          );
          record.shortlists = record.shortlists.filter(
            (shortlist) => shortlist.serviceLine !== "transfer",
          );
        }

        await pushAudit("readiness_validated", {
          blockerCount: blockedServiceLinesAfterSelection.length,
          ready: blockedServiceLinesAfterSelection.length === 0,
        });

        if (blockedServiceLinesAfterSelection.length > 0) {
          await pushAudit("fallback_triggered", {
            blockedServices: blockedServiceLinesAfterSelection.join(","),
            reason: "supplier_anchor_resolution",
          });
        }

        if (shouldRefreshTransfer && nextIntake) {
          const transferSearchResult = await hotelbedsAdapter.search(
            nextIntake,
            "transfer",
          );

          upsertShortlist(
            record,
            buildShortlistFromSearchResult(
              quoteSessionId,
              transferSearchResult,
            ),
          );
          await pushAudit("search_execution_completed", {
            services: 1,
            weakShortlist: transferSearchResult.weakShortlist,
          });
          await pushAudit("shortlist_created", {
            shortlistCount: record.shortlists.length,
          });

          if (transferSearchResult.error) {
            await pushAudit("fallback_triggered", {
              blockedServices: "transfer",
              reason: transferSearchResult.error.code,
            });
          }
        }
      }

      const bundleSummary = buildBundleSummary(record);
      const nextPendingQuestion =
        bundleSummary.targetState === "clarifying"
          ? getSupplierAnchorQuestion(record)
          : null;

      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: hasSelectionChanged
          ? record.session.activeQuoteVersion + 1
          : record.session.activeQuoteVersion,
        latestContextSummary: bundleSummary.summary,
        pendingQuestion: nextPendingQuestion,
        status: bundleSummary.targetState,
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason:
          envelope.commandName === "replace_cart_item"
            ? `Se reemplazo la seleccion de ${selectedOption.serviceLine}`
            : `Se promovio ${selectedOption.title} al quote activo`,
        diffSummary: hasSelectionChanged
          ? "La version activa cambio su seleccion principal."
          : "La seleccion activa se confirmo sin cambio de version.",
      });
      await repository.saveRecord(record);
      await pushAudit("cart_item_selected", {
        exportReady: bundleSummary.bundleReview?.isExportReady ?? false,
        invalidatedTransferSelection:
          selectedOption.serviceLine === "hotel" && hasSelectionChanged,
        optionChanged: hasSelectionChanged,
        optionId: selectedOption.id,
        serviceLine: selectedOption.serviceLine,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }
      await pushAudit("bundle_review_refreshed", {
        blockerCount: bundleSummary.bundleReview?.blockers.length ?? 0,
        exportReady: bundleSummary.bundleReview?.isExportReady ?? false,
        selectedItems: bundleSummary.bundleReview?.selectedItems.length ?? 0,
      });

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: bundleSummary.nextAction,
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record, {
          selectedItems: record.selectedItems,
        }),
      };
    }

    if (envelope.commandName === "remove_cart_item") {
      const optionId = String(envelope.payload.optionId ?? "");
      const serviceLine = String(envelope.payload.serviceLine ?? "");
      const itemToRemove = record.selectedItems.find(
        (item) =>
          (optionId.length > 0 && item.id === optionId) ||
          (serviceLine.length > 0 && item.serviceLine === serviceLine),
      );

      if (!itemToRemove) {
        throw new Error("quote_cart_item_not_found");
      }

      record.selectedItems = record.selectedItems.filter(
        (item) => item.id !== itemToRemove.id,
      );

      const bundleSummary = buildBundleSummary(record);
      const nextPendingQuestion =
        bundleSummary.targetState === "clarifying"
          ? getSupplierAnchorQuestion(record)
          : null;
      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: record.session.activeQuoteVersion + 1,
        latestContextSummary: bundleSummary.summary,
        pendingQuestion: nextPendingQuestion,
        status: bundleSummary.targetState,
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason: `Se retiro ${itemToRemove.title} del quote activo`,
        diffSummary: "La version activa perdio una capa seleccionada.",
      });
      await repository.saveRecord(record);
      await pushAudit("cart_item_removed", {
        optionId: itemToRemove.id,
        serviceLine: itemToRemove.serviceLine,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }
      await pushAudit("bundle_review_refreshed", {
        blockerCount: bundleSummary.bundleReview?.blockers.length ?? 0,
        exportReady: bundleSummary.bundleReview?.isExportReady ?? false,
        selectedItems: bundleSummary.bundleReview?.selectedItems.length ?? 0,
      });

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: bundleSummary.nextAction,
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record, {
          selectedItems: record.selectedItems,
        }),
      };
    }

    if (envelope.commandName === "refresh_bundle_review") {
      const bundleSummary = buildBundleSummary(record);
      const nextPendingQuestion =
        bundleSummary.targetState === "clarifying"
          ? getSupplierAnchorQuestion(record)
          : null;
      record.session = updateSessionMeta(record.session, {
        latestContextSummary: bundleSummary.summary,
        pendingQuestion: nextPendingQuestion,
        status: bundleSummary.targetState,
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason: "Bundle review refrescado",
      });
      await repository.saveRecord(record);
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }
      await pushAudit("bundle_review_refreshed", {
        blockerCount: bundleSummary.bundleReview?.blockers.length ?? 0,
        exportReady: bundleSummary.bundleReview?.isExportReady ?? false,
        selectedItems: bundleSummary.bundleReview?.selectedItems.length ?? 0,
      });

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: bundleSummary.nextAction,
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record, {
          selectedItems: record.selectedItems,
        }),
      };
    }

    if (envelope.commandName === "request_more_options") {
      if (!record.intake) {
        throw new Error("quote_intake_not_found");
      }

      const intake = record.intake;

      const requestedServiceLine =
        typeof envelope.payload.serviceLine === "string"
          ? serviceLineSchema.parse(envelope.payload.serviceLine)
          : null;
      const readyServiceLines = intake.requestedServiceLines.filter(
        (serviceLine) => intake.readinessByServiceLine[serviceLine] === "ready",
      );
      const targetServiceLines = requestedServiceLine
        ? readyServiceLines.filter(
            (serviceLine) => serviceLine === requestedServiceLine,
          )
        : readyServiceLines;

      if (targetServiceLines.length === 0) {
        throw new Error("quote_service_search_not_ready");
      }

      const results = await Promise.all(
        targetServiceLines.map((serviceLine) =>
          hotelbedsAdapter.search(intake, serviceLine),
        ),
      );

      for (const result of results) {
        upsertShortlist(
          record,
          buildShortlistFromSearchResult(quoteSessionId, result),
        );
      }

      const bundleSummary = buildBundleSummary(record);
      record.session = updateSessionMeta(record.session, {
        latestContextSummary:
          targetServiceLines.length === 1
            ? `Se ampliaron opciones para ${targetServiceLines[0]}.`
            : "Se ampliaron opciones para las capas supplier-ready del caso.",
        pendingQuestion:
          bundleSummary.targetState === "clarifying"
            ? getSupplierAnchorQuestion(record)
            : null,
        status: bundleSummary.targetState,
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason:
          targetServiceLines.length === 1
            ? `Se pidieron mas opciones para ${targetServiceLines[0]}`
            : "Se pidieron mas opciones para el quote activo",
        diffSummary:
          "La shortlist operator-facing se refresco sin sustituir el quote activo.",
      });

      await repository.saveRecord(record);
      await pushAudit("search_execution_completed", {
        services: targetServiceLines.length,
        weakShortlist: results.some((result) => result.weakShortlist),
      });
      await pushAudit("shortlist_created", {
        shortlistCount: record.shortlists.length,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: getNextActionForRecord(record),
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record, {
          shortlists: record.shortlists,
        }),
      };
    }

    if (envelope.commandName === "confirm_recommendation_mode") {
      const recommendationMode = recommendationModeSchema.parse(
        envelope.payload.recommendationMode ?? envelope.payload.mode,
      );
      record.session = updateSessionMeta(record.session, {
        latestContextSummary: `Modo de recomendacion confirmado: ${recommendationMode}.`,
        recommendationMode,
      });
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason: "Modo de recomendacion actualizado",
        diffSummary: `El quote activo ahora se presenta en modo ${recommendationMode}.`,
      });

      await repository.saveRecord(record);
      await pushAudit("recommendation_mode_confirmed", {
        recommendationMode,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: getNextActionForRecord(record),
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record),
      };
    }

    if (envelope.commandName === "save_operator_note") {
      const content = String(envelope.payload.content ?? "").trim();
      const timestamp = nowIso();

      record.operatorNote = {
        content,
        createdAt: record.operatorNote?.createdAt ?? timestamp,
        id: record.operatorNote?.id ?? createId(),
        quoteSessionId: record.session.id,
        updatedAt: timestamp,
      };

      await repository.saveRecord(record);
      await pushAudit("operator_note_saved", {
        contentLength: content.length,
      });

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: getNextActionForRecord(record),
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record),
      };
    }

    if (envelope.commandName === "update_commercial_status") {
      const commercialStatus = commercialStatusSchema.parse(
        envelope.payload.commercialStatus ?? envelope.payload.status,
      );
      record.session = updateSessionMeta(record.session, {
        commercialStatus,
        latestContextSummary: `Estado comercial actualizado a ${commercialStatus}.`,
      });
      if (commercialStatus === "archivada") {
        record.session.status = "archived";
        record.session.archivedAt = nowIso();
      }
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason: "Estado comercial actualizado",
        diffSummary: `La version activa ahora refleja ${commercialStatus}.`,
      });

      await repository.saveRecord(record);
      await pushAudit("commercial_status_updated", {
        commercialStatus,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: getNextActionForRecord(record),
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record),
      };
    }

    if (envelope.commandName === "generate_quote_pdf") {
      const exportSnapshotInput = buildQuoteExportSnapshot(record);
      const exportSummary = `Quote export v${record.session.activeQuoteVersion} generado desde bundle review estable.`;

      if (!exportSnapshotInput) {
        throw new Error("quote_export_not_ready");
      }

      const exportSnapshot = await repository.createQuoteExportSnapshot({
        ...exportSnapshotInput,
        confirmedStateSummary: exportSummary,
        status: "exported",
      });
      const exportId = createId();
      const storedFile = await quoteExportStorage.storeFile({
        bytes: await quotePdfRenderer.render(exportSnapshot),
        exportId,
        fileName: buildQuotePdfFileName(exportSnapshot),
        mimeType: "application/pdf",
        quoteSessionId: record.session.id,
      });
      const quoteExport = await repository.createQuoteExport({
        activeQuoteVersion: exportSnapshot.activeQuoteVersion,
        id: exportId,
        quoteSessionId: record.session.id,
        snapshotId: exportSnapshot.id,
        ...storedFile,
      });

      record.session = updateSessionMeta(record.session, {
        latestContextSummary: exportSummary,
        pendingQuestion: null,
        status: "exported",
      });
      record = await repository.saveRecord(record);

      await pushAudit("quote_export_generated", {
        activeQuoteVersion: quoteExport.activeQuoteVersion,
        exportId: quoteExport.id,
        snapshotId: exportSnapshot.id,
        selectedItems: exportSnapshot.selectedItems.length,
      });

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: "await_operator_input",
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record, {
          exportId: quoteExport.id,
          exportPath: `/quotes/${record.session.id}/export/${quoteExport.id}`,
          exportSnapshot,
          pdfPath: `/api/quote-sessions/${record.session.id}/exports/${quoteExport.id}/pdf`,
          quoteExport,
        }),
      };
    }

    if (envelope.commandName === "restore_quote_session") {
      const bundleSummary = buildBundleSummary(record);
      const nextStatus =
        record.shortlists.length > 0 || record.selectedItems.length > 0
          ? bundleSummary.targetState
          : record.intake?.missingFields.length
            ? "clarifying"
            : "draft";
      record.session = updateSessionMeta(record.session, {
        commercialStatus:
          record.selectedItems.length > 0 || record.shortlists.length > 0
            ? "en_seguimiento"
            : "abierta",
        latestContextSummary:
          "Caso reactivado. El resumen actual vuelve al frente y el transcript queda disponible debajo.",
        pendingQuestion:
          nextStatus === "clarifying"
            ? (record.session.pendingQuestion ??
              getSupplierAnchorQuestion(record))
            : null,
        status: nextStatus,
      });
      record.session.archivedAt = null;
      const syncedVersion = syncQuoteVersionRecord(record, {
        changeReason: "Caso reactivado",
        diffSummary:
          "La continuidad del quote activo se restauro desde archivo.",
      });

      await repository.saveRecord(record);
      await pushAudit("quote_session_restored", {
        restored: true,
      });
      if (syncedVersion) {
        await pushAudit("quote_version_synced", {
          coverageState: syncedVersion.coverageState,
          versionNumber: syncedVersion.versionNumber,
        });
      }

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: getNextActionForRecord(record),
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record),
      };
    }

    if (envelope.commandName === "archive_quote_session") {
      record.session = updateSessionMeta(record.session, {
        commercialStatus: "archivada",
        latestContextSummary:
          "La cotizacion fue archivada y sigue disponible para reactivacion.",
        status: "archived",
      });
      record.session.archivedAt = nowIso();
      await repository.saveRecord(record);
      await pushAudit("quote_session_archived", { archived: true });

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: "await_operator_input",
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: buildViewModelDelta(record),
      };
    }

    throw new Error("quote_command_not_implemented");
  };
};

export const runQuoteCommand = createQuoteCommandRunner();
