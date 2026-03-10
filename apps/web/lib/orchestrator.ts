import { createHotelbedsAdapter } from "@alana/hotelbeds";
import {
  createOpenAiResponsesRuntime,
  createQuoteCommandRunner,
} from "@alana/orchestration";

import { assertHotelbedsEnabled, getRuntimeConfig } from "@/lib/runtime-config";

export const getQuoteCommandRunner = () => {
  const config = getRuntimeConfig();
  const dependencies: Parameters<typeof createQuoteCommandRunner>[0] = {};

  if (config.AI_PROVIDER === "openai") {
    dependencies.aiRuntime = createOpenAiResponsesRuntime({
      apiKey: config.OPENAI_API_KEY ?? "",
      intakeReasoningEffort: config.OPENAI_REASONING_INTAKE,
      model: config.OPENAI_MODEL,
    });
  }

  if (config.HOTELBEDS_PROVIDER === "hotelbeds") {
    const hotelbedsConfig = assertHotelbedsEnabled();

    dependencies.hotelbedsAdapter = createHotelbedsAdapter({
      activities: {
        apiKey: hotelbedsConfig.HOTELBEDS_ACTIVITIES_API_KEY,
        baseUrl: hotelbedsConfig.HOTELBEDS_BASE_URL,
        secret: hotelbedsConfig.HOTELBEDS_ACTIVITIES_SECRET,
        timeoutMs: hotelbedsConfig.HOTELBEDS_TIMEOUT_MS,
      },
      hotels: {
        apiKey: hotelbedsConfig.HOTELBEDS_HOTELS_API_KEY,
        baseUrl: hotelbedsConfig.HOTELBEDS_BASE_URL,
        secret: hotelbedsConfig.HOTELBEDS_HOTELS_SECRET,
        timeoutMs: hotelbedsConfig.HOTELBEDS_TIMEOUT_MS,
      },
      language: hotelbedsConfig.HOTELBEDS_DEFAULT_LANGUAGE,
      transfers: {
        apiKey: hotelbedsConfig.HOTELBEDS_TRANSFERS_API_KEY,
        baseUrl: hotelbedsConfig.HOTELBEDS_BASE_URL,
        secret: hotelbedsConfig.HOTELBEDS_TRANSFERS_SECRET,
        timeoutMs: hotelbedsConfig.HOTELBEDS_TIMEOUT_MS,
      },
    });
  }

  return createQuoteCommandRunner(dependencies);
};
