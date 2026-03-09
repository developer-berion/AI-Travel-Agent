import {
  buildContextPackage,
  createMockQuoteRepository,
  createSessionTitle,
  createSupabaseQuoteRepository,
} from "@alana/database";

import { getRuntimeConfig } from "@/lib/runtime-config";
import { createRequestSupabaseClient } from "@/lib/supabase/server";

const mockRepository = createMockQuoteRepository();

export const getQuoteRepository = async () => {
  const config = getRuntimeConfig();

  if (config.QUOTE_REPOSITORY_MODE === "mock") {
    return mockRepository;
  }

  const supabaseClient = await createRequestSupabaseClient();
  return createSupabaseQuoteRepository(supabaseClient);
};

export { buildContextPackage, createSessionTitle };
