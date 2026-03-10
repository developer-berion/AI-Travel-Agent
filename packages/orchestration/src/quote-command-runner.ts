import {
  type QuoteRecord,
  type QuoteRepository,
  buildBundleReviewView,
  buildContextPackage,
  updateSessionMeta,
} from "@alana/database";
import {
  type QuoteCommandEnvelope,
  type QuoteCommandResult,
  type ServiceLine,
  assertCommandAllowed,
} from "@alana/domain";
import type { HotelbedsSearchAdapter } from "@alana/hotelbeds";
import {
  createMockHotelbedsAdapter,
  enrichStructuredIntakeWithHotelbedsAnchors,
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

const buildBundleSummary = (record: QuoteRecord) => {
  const bundleReview = buildBundleReviewView(record);

  if (!bundleReview) {
    return {
      bundleReview: null,
      nextAction: "bundle_blocked" as const,
      targetState: "reviewing" as const,
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

  return {
    bundleReview,
    nextAction: "bundle_blocked" as const,
    targetState: "reviewing" as const,
    summary:
      bundleReview.blockers[0] ??
      "El bundle review sigue en revision y necesita mas selecciones.",
  };
};

export const createQuoteCommandRunner = (dependencies?: {
  aiRuntime?: QuoteAiRuntime;
  hotelbedsAdapter?: HotelbedsSearchAdapter;
}) => {
  const aiRuntime = dependencies?.aiRuntime ?? createMockAiRuntime();
  const hotelbedsAdapter =
    dependencies?.hotelbedsAdapter ?? createMockHotelbedsAdapter();

  return async (
    repository: QuoteRepository,
    envelope: QuoteCommandEnvelope,
  ): Promise<QuoteCommandResult> => {
    const record = await repository.getRecord(envelope.quoteSessionId);

    if (!record) {
      throw new Error("quote_session_not_found");
    }

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
        quoteSessionId: record.session.id,
        eventName,
        payload,
      });
      auditEventIds.push(event.id);
    };

    if (
      envelope.commandName === "append_operator_message" ||
      envelope.commandName === "submit_clarification_answer"
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
          : "clarification_answer_recorded",
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
          viewModelDelta: {
            blockers: intake.missingFields,
            contextPackage: buildContextPackage(record),
            question: record.session.pendingQuestion,
          },
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
          viewModelDelta: {
            blockers: blockedServiceLines,
            contextPackage: buildContextPackage(record),
            question: record.session.pendingQuestion,
          },
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
      record.shortlists = results.map((result) => ({
        id: createId(),
        items: result.options,
        quoteSessionId: record.session.id,
        reason: result.warning ?? result.error?.message ?? null,
        serviceLine: result.serviceLine,
        weakShortlist: result.weakShortlist,
      }));

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
        viewModelDelta: {
          bundleReview: buildBundleReviewView(record),
          contextPackage: buildContextPackage(record),
          shortlists: record.shortlists,
          summary: buildAssistantSummary(record),
        },
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

      const bundleSummary = buildBundleSummary(record);
      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: hasSelectionChanged
          ? record.session.activeQuoteVersion + 1
          : record.session.activeQuoteVersion,
        latestContextSummary: bundleSummary.summary,
        pendingQuestion: null,
        status: bundleSummary.targetState,
      });
      await repository.saveRecord(record);
      await pushAudit("cart_item_selected", {
        exportReady: bundleSummary.bundleReview?.isExportReady ?? false,
        optionChanged: hasSelectionChanged,
        optionId: selectedOption.id,
        serviceLine: selectedOption.serviceLine,
      });
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
        viewModelDelta: {
          bundleReview: bundleSummary.bundleReview,
          contextPackage: buildContextPackage(record),
          selectedItems: record.selectedItems,
        },
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
      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: record.session.activeQuoteVersion + 1,
        latestContextSummary: bundleSummary.summary,
        pendingQuestion: null,
        status: bundleSummary.targetState,
      });
      await repository.saveRecord(record);
      await pushAudit("cart_item_removed", {
        optionId: itemToRemove.id,
        serviceLine: itemToRemove.serviceLine,
      });
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
        viewModelDelta: {
          bundleReview: bundleSummary.bundleReview,
          contextPackage: buildContextPackage(record),
          selectedItems: record.selectedItems,
        },
      };
    }

    if (envelope.commandName === "refresh_bundle_review") {
      const bundleSummary = buildBundleSummary(record);
      record.session = updateSessionMeta(record.session, {
        latestContextSummary: bundleSummary.summary,
        pendingQuestion: null,
        status: bundleSummary.targetState,
      });
      await repository.saveRecord(record);
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
        viewModelDelta: {
          bundleReview: bundleSummary.bundleReview,
          contextPackage: buildContextPackage(record),
          selectedItems: record.selectedItems,
        },
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
        viewModelDelta: {
          contextPackage: buildContextPackage(record),
        },
      };
    }

    throw new Error("quote_command_not_implemented");
  };
};

export const runQuoteCommand = createQuoteCommandRunner();
