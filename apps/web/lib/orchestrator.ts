import {
  createOpenAiResponsesRuntime,
  createQuoteCommandRunner,
} from "@alana/orchestration";

import { getRuntimeConfig } from "@/lib/runtime-config";

export const getQuoteCommandRunner = () => {
  const config = getRuntimeConfig();

  if (config.AI_PROVIDER === "openai") {
    const aiRuntime = createOpenAiResponsesRuntime({
      apiKey: config.OPENAI_API_KEY ?? "",
      intakeReasoningEffort: config.OPENAI_REASONING_INTAKE,
      model: config.OPENAI_MODEL,
    });

    return createQuoteCommandRunner({ aiRuntime });
  }

  return createQuoteCommandRunner();
};
