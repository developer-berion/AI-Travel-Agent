import type {
  AuditEvent,
  OperatorNote,
  QuoteExport,
  QuoteExportSnapshot,
  QuoteMessage,
  QuoteSession,
  QuoteVersion,
} from "@alana/domain";
import { createId, nowIso } from "@alana/shared";

import type { QuoteRecord, QuoteRepository } from "./context-package";

type Store = {
  exports: Map<string, QuoteExport>;
  exportSnapshots: Map<string, QuoteExportSnapshot>;
  operatorNotes: Map<string, OperatorNote>;
  quoteVersions: Map<string, QuoteVersion[]>;
  records: Map<string, QuoteRecord>;
};

const getStore = (): Store => {
  const key = "__alana_quote_store__";
  const globalStore = globalThis as typeof globalThis & {
    [key]?: Store;
  };

  if (!globalStore[key]) {
    globalStore[key] = {
      exports: new Map<string, QuoteExport>(),
      operatorNotes: new Map<string, OperatorNote>(),
      quoteVersions: new Map<string, QuoteVersion[]>(),
      records: new Map<string, QuoteRecord>(),
      exportSnapshots: new Map<string, QuoteExportSnapshot>(),
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
        operatorNote: null,
        quoteVersions: [],
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
      const record = store.records.get(quoteSessionId);

      if (!record) {
        return null;
      }

      return {
        ...record,
        operatorNote: store.operatorNotes.get(quoteSessionId) ?? null,
        quoteVersions: store.quoteVersions.get(quoteSessionId) ?? [],
      };
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
      if (updatedRecord.operatorNote) {
        store.operatorNotes.set(
          updatedRecord.session.id,
          updatedRecord.operatorNote,
        );
      } else {
        store.operatorNotes.delete(updatedRecord.session.id);
      }
      store.quoteVersions.set(
        updatedRecord.session.id,
        updatedRecord.quoteVersions,
      );
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
    createQuoteExportSnapshot(snapshot) {
      const createdSnapshot: QuoteExportSnapshot = {
        createdAt: nowIso(),
        id: createId(),
        ...snapshot,
      };

      store.exportSnapshots.set(createdSnapshot.id, createdSnapshot);
      return createdSnapshot;
    },
    createQuoteExport(quoteExport) {
      const createdExport: QuoteExport = {
        createdAt: nowIso(),
        ...quoteExport,
      };

      store.exports.set(createdExport.id, createdExport);
      return createdExport;
    },
    getQuoteExport(quoteSessionId, exportId) {
      const quoteExport = store.exports.get(exportId);

      if (!quoteExport || quoteExport.quoteSessionId !== quoteSessionId) {
        return null;
      }

      return quoteExport;
    },
    getQuoteExportSnapshot(quoteSessionId, snapshotId) {
      const snapshot = store.exportSnapshots.get(snapshotId);

      if (!snapshot || snapshot.quoteSessionId !== quoteSessionId) {
        return null;
      }

      return snapshot;
    },
  };
};
