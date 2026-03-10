import type { AuditEvent, QuoteMessage, QuoteSession } from "@alana/domain";
import { createId, nowIso } from "@alana/shared";

import type { QuoteRecord, QuoteRepository } from "./context-package";

type Store = {
  records: Map<string, QuoteRecord>;
};

const getStore = (): Store => {
  const key = "__alana_quote_store__";
  const globalStore = globalThis as typeof globalThis & {
    [key]?: Store;
  };

  if (!globalStore[key]) {
    globalStore[key] = {
      records: new Map<string, QuoteRecord>(),
    };
  }

  return globalStore[key];
};

export const createMockQuoteRepository = (): QuoteRepository => {
  const store = getStore();

  return {
    createSession(input) {
      const timestamp = nowIso();
      const record: QuoteRecord = {
        session: {
          id: createId(),
          operatorId: input.operatorId,
          title: input.title,
          agencyName: input.agencyName,
          tripLabel: "Pending destination",
          tripStartDate: null,
          status: "draft",
          commercialStatus: "abierta",
          recommendationMode: "best_match",
          activeQuoteVersion: 0,
          latestContextSummary: "Nueva cotizacion lista para intake.",
          pendingQuestion:
            "Comparte el pedido del viajero para iniciar la cotizacion.",
          lastActivityAt: timestamp,
          archivedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        messages: [],
        intake: null,
        selectedItems: [],
        shortlists: [],
        auditEvents: [],
      };

      store.records.set(record.session.id, record);
      return record;
    },
    listSessions(operatorId) {
      return [...store.records.values()]
        .map((record) => record.session)
        .filter((session) => session.operatorId === operatorId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    getRecord(quoteSessionId) {
      return store.records.get(quoteSessionId) ?? null;
    },
    saveRecord(record) {
      const updatedRecord = {
        ...record,
        session: {
          ...record.session,
          updatedAt: nowIso(),
          lastActivityAt: nowIso(),
        },
      };

      store.records.set(updatedRecord.session.id, updatedRecord);
      return updatedRecord;
    },
    appendMessage(message) {
      const record = store.records.get(message.quoteSessionId);

      if (!record) {
        throw new Error("quote_session_not_found");
      }

      const createdMessage: QuoteMessage = {
        id: createId(),
        createdAt: nowIso(),
        ...message,
      };

      record.messages.push(createdMessage);
      record.session.updatedAt = nowIso();
      record.session.lastActivityAt = nowIso();

      return createdMessage;
    },
    appendAuditEvent(event) {
      const record = store.records.get(event.quoteSessionId);

      if (!record) {
        throw new Error("quote_session_not_found");
      }

      const createdEvent: AuditEvent = {
        id: createId(),
        createdAt: nowIso(),
        ...event,
      };

      record.auditEvents.push(createdEvent);
      return createdEvent;
    },
  };
};
