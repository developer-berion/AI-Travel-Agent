import type { QuoteExport } from "@alana/domain";

import { getRuntimeConfig } from "@/lib/runtime-config";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type StoredQuoteExportFile = Pick<
  QuoteExport,
  "fileName" | "fileSizeBytes" | "mimeType" | "storageBucket" | "storagePath"
>;

export type QuoteExportFileReference = Pick<
  QuoteExport,
  "fileName" | "mimeType" | "storageBucket" | "storagePath"
>;

export type QuoteExportStorage = {
  readFile(
    reference: QuoteExportFileReference,
  ): Promise<Uint8Array | null> | Uint8Array | null;
  storeFile(input: {
    bytes: Uint8Array;
    exportId: string;
    fileName: string;
    mimeType: string;
    quoteSessionId: string;
  }): Promise<StoredQuoteExportFile> | StoredQuoteExportFile;
};

type MemoryStorageStore = Map<string, Uint8Array>;

const getMemoryStorageStore = (): MemoryStorageStore => {
  const key = "__alana_quote_export_storage__";
  const globalStore = globalThis as typeof globalThis & {
    [key]?: MemoryStorageStore;
  };

  if (!globalStore[key]) {
    globalStore[key] = new Map<string, Uint8Array>();
  }

  return globalStore[key];
};

const buildStorageKey = (bucket: string, path: string) => `${bucket}:${path}`;

const buildStoragePath = ({
  exportId,
  fileName,
  quoteSessionId,
}: {
  exportId: string;
  fileName: string;
  quoteSessionId: string;
}) => `quote-sessions/${quoteSessionId}/exports/${exportId}/${fileName}`;

export const createMockQuoteExportStorage = (): QuoteExportStorage => {
  const bucket = "quote-exports";
  const store = getMemoryStorageStore();

  return {
    readFile(reference) {
      const bytes = store.get(
        buildStorageKey(reference.storageBucket, reference.storagePath),
      );

      return bytes ? Uint8Array.from(bytes) : null;
    },
    storeFile(input) {
      const storagePath = buildStoragePath(input);
      const bytes = Uint8Array.from(input.bytes);

      store.set(buildStorageKey(bucket, storagePath), bytes);

      return {
        fileName: input.fileName,
        fileSizeBytes: bytes.byteLength,
        mimeType: input.mimeType,
        storageBucket: bucket,
        storagePath,
      };
    },
  };
};

export const createSupabaseQuoteExportStorage = (): QuoteExportStorage => {
  const config = getRuntimeConfig();
  const storageBucket = config.QUOTE_EXPORTS_BUCKET;

  return {
    async readFile(reference) {
      const adminClient = createAdminSupabaseClient();
      const { data, error } = await adminClient.storage
        .from(reference.storageBucket)
        .download(reference.storagePath);

      if (error) {
        if (error.message.toLowerCase().includes("not found")) {
          return null;
        }

        throw error;
      }

      return new Uint8Array(await data.arrayBuffer());
    },
    async storeFile(input) {
      const adminClient = createAdminSupabaseClient();
      const storagePath = buildStoragePath(input);
      const bytes = Uint8Array.from(input.bytes);
      const { error } = await adminClient.storage
        .from(storageBucket)
        .upload(storagePath, bytes, {
          contentType: input.mimeType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      return {
        fileName: input.fileName,
        fileSizeBytes: bytes.byteLength,
        mimeType: input.mimeType,
        storageBucket,
        storagePath,
      };
    },
  };
};

const mockStorage = createMockQuoteExportStorage();

export const getQuoteExportStorage = (): QuoteExportStorage => {
  const config = getRuntimeConfig();

  if (config.QUOTE_REPOSITORY_MODE === "mock") {
    return mockStorage;
  }

  return createSupabaseQuoteExportStorage();
};
