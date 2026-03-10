import { z } from "@alana/shared";

const executionModeSchema = z.enum(["mock", "supabase"]);
const aiProviderSchema = z.enum(["mock", "openai"]);
const hotelbedsProviderSchema = z.enum(["mock", "hotelbeds"]);
const reasoningEffortSchema = z.enum([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

const runtimeConfigSchema = z.object({
  AUTH_MODE: executionModeSchema.default("mock"),
  QUOTE_REPOSITORY_MODE: executionModeSchema.default("mock"),
  AI_PROVIDER: aiProviderSchema.default("mock"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Alana Travel Quoting OS"),
  NEXT_PUBLIC_API_BASE_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_REASONING_INTAKE: reasoningEffortSchema.default("minimal"),
  OPENAI_REASONING_ROUTING: reasoningEffortSchema.default("low"),
  OPENAI_REASONING_PACKAGING: reasoningEffortSchema.default("medium"),
  HOTELBEDS_PROVIDER: hotelbedsProviderSchema.default("mock"),
  HOTELBEDS_BASE_URL: z
    .string()
    .url()
    .default("https://api.test.hotelbeds.com"),
  HOTELBEDS_DEFAULT_LANGUAGE: z.string().min(2).default("en"),
  HOTELBEDS_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  HOTELBEDS_HOTELS_API_KEY: z.string().min(1).optional(),
  HOTELBEDS_HOTELS_SECRET: z.string().min(1).optional(),
  HOTELBEDS_ACTIVITIES_API_KEY: z.string().min(1).optional(),
  HOTELBEDS_ACTIVITIES_SECRET: z.string().min(1).optional(),
  HOTELBEDS_TRANSFERS_API_KEY: z.string().min(1).optional(),
  HOTELBEDS_TRANSFERS_SECRET: z.string().min(1).optional(),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type HotelbedsEnabledRuntimeConfig = RuntimeConfig & {
  HOTELBEDS_ACTIVITIES_API_KEY: string;
  HOTELBEDS_ACTIVITIES_SECRET: string;
  HOTELBEDS_HOTELS_API_KEY: string;
  HOTELBEDS_HOTELS_SECRET: string;
  HOTELBEDS_PROVIDER: "hotelbeds";
  HOTELBEDS_TRANSFERS_API_KEY: string;
  HOTELBEDS_TRANSFERS_SECRET: string;
};

let cachedConfig: RuntimeConfig | null = null;

export const getRuntimeConfig = (): RuntimeConfig => {
  if (!cachedConfig) {
    cachedConfig = runtimeConfigSchema.parse(process.env);
  }

  return cachedConfig;
};

export const assertSupabaseEnabled = () => {
  const config = getRuntimeConfig();
  const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL ?? config.SUPABASE_URL;
  const supabaseAnonKey =
    config.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? config.SUPABASE_ANON_KEY;

  if (
    config.AUTH_MODE !== "supabase" &&
    config.QUOTE_REPOSITORY_MODE !== "supabase"
  ) {
    throw new Error("supabase_mode_not_enabled");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("supabase_env_missing");
  }

  return {
    ...config,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  };
};

export const assertSupabaseAdminEnabled = () => {
  const config = assertSupabaseEnabled();

  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("supabase_service_role_key_missing");
  }

  return config;
};

export const assertOpenAiEnabled = () => {
  const config = getRuntimeConfig();

  if (config.AI_PROVIDER !== "openai") {
    throw new Error("openai_mode_not_enabled");
  }

  if (!config.OPENAI_API_KEY) {
    throw new Error("openai_api_key_missing");
  }

  return config;
};

export const assertHotelbedsEnabled = () => {
  const config = getRuntimeConfig();

  if (config.HOTELBEDS_PROVIDER !== "hotelbeds") {
    throw new Error("hotelbeds_mode_not_enabled");
  }

  if (
    !config.HOTELBEDS_HOTELS_API_KEY ||
    !config.HOTELBEDS_HOTELS_SECRET ||
    !config.HOTELBEDS_ACTIVITIES_API_KEY ||
    !config.HOTELBEDS_ACTIVITIES_SECRET ||
    !config.HOTELBEDS_TRANSFERS_API_KEY ||
    !config.HOTELBEDS_TRANSFERS_SECRET
  ) {
    throw new Error("hotelbeds_env_missing");
  }

  return config as HotelbedsEnabledRuntimeConfig;
};
