import {
  type QuoteRecord,
  type QuoteRepository,
  buildContextPackage,
  updateSessionMeta,
} from "@alana/database";
import {
  type QuoteCommandEnvelope,
  type QuoteCommandResult,
  assertCommandAllowed,
} from "@alana/domain";
import type { HotelbedsSearchAdapter } from "@alana/hotelbeds";
import { createMockHotelbedsAdapter } from "@alana/hotelbeds";
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
        previousResponseId,
        quoteSessionId: record.session.id,
      });
      const intake = createStructuredIntake(record.session.id, extraction);
      record.intake = intake;
      await pushAudit("intake_extracted", {
        blockers: intake.missingFields.length,
        contradictions: intake.contradictions.length,
        openai_response_id: extraction.previousResponseId,
      });

      if (intake.missingFields.length > 0) {
        record.shortlists = [];
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
          tripStartDate:
            Array.isArray(intake.extractedFields.travelDates) &&
            intake.extractedFields.travelDates.length > 0
              ? String(intake.extractedFields.travelDates[0])
              : null,
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

      record.session = updateSessionMeta(record.session, {
        latestContextSummary: "Readiness valida. Ejecutando supplier searches.",
        pendingQuestion: null,
        status: "searching",
        tripLabel: `Trip to ${String(intake.extractedFields.destination)}`,
        tripStartDate: String(
          (intake.extractedFields.travelDates as string[])[0] ?? "",
        ),
      });
      await pushAudit("readiness_validated", { blockerCount: 0, ready: true });

      const results = await Promise.all(
        intake.requestedServiceLines.map((serviceLine) =>
          hotelbedsAdapter.search(intake, serviceLine),
        ),
      );

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

      record.session = updateSessionMeta(record.session, {
        activeQuoteVersion: record.session.activeQuoteVersion + 1,
        latestContextSummary: hasWeakShortlist
          ? "La cotizacion es parcial o debil y requiere caveats visibles."
          : hasNoResults
            ? "Una capa no devolvio resultados; se requiere fallback honesto."
            : "La cotizacion ya tiene shortlist util para revision operator-facing.",
        status: "reviewing",
      });

      await pushAudit("search_execution_completed", {
        services: results.length,
        weakShortlist: hasWeakShortlist,
      });
      await pushAudit("shortlist_created", {
        shortlistCount: record.shortlists.length,
      });
      await pushAudit("state_transition_recorded", {
        targetState: record.session.status,
      });

      await repository.appendMessage({
        quoteSessionId: record.session.id,
        role: "assistant",
        content: hasWeakShortlist
          ? "Encontre una salida util, pero una capa necesita caveats visibles o seguimiento."
          : "Ya tengo una shortlist inicial y la deje lista para revision.",
      });

      await repository.saveRecord(record);

      return {
        auditEventIds,
        commandId: envelope.commandId,
        nextAction: "results_ready",
        quoteSessionId: record.session.id,
        sessionStateVersion: record.session.activeQuoteVersion,
        viewModelDelta: {
          contextPackage: buildContextPackage(record),
          shortlists: record.shortlists,
          summary: buildAssistantSummary(record),
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
