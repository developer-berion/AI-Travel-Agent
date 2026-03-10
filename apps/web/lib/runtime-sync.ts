import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import webPackageJson from "../package.json";

import { getRuntimeConfig } from "./runtime-config";

const DEFAULT_MIGRATION_HEAD = "20260310163000_quote_exports_storage.sql";
const RESOLVED_BUILD_AT =
  process.env.ALANA_RUNTIME_BUILD_AT?.trim() || new Date().toISOString();

const getFirstNonEmpty = (...values: Array<string | undefined>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

export const selectLatestMigrationHead = (entries: string[]) =>
  [...entries]
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? null;

export const detectLatestLocalMigrationHead = () => {
  const candidateDirectories = [
    path.resolve(process.cwd(), "supabase", "migrations"),
    path.resolve(process.cwd(), "..", "..", "supabase", "migrations"),
  ];

  for (const directory of candidateDirectories) {
    if (!existsSync(directory)) {
      continue;
    }

    const latestMigrationHead = selectLatestMigrationHead(
      readdirSync(directory),
    );

    if (latestMigrationHead) {
      return latestMigrationHead;
    }
  }

  return null;
};

const resolveGitSha = () =>
  getFirstNonEmpty(
    process.env.ALANA_RUNTIME_GIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.SOURCE_VERSION,
    process.env.COMMIT_SHA,
  ) ?? "unknown";

const resolveMigrationHead = () =>
  getFirstNonEmpty(process.env.ALANA_RUNTIME_MIGRATION_HEAD) ??
  detectLatestLocalMigrationHead() ??
  DEFAULT_MIGRATION_HEAD;

export type RuntimeSyncPayload = {
  AI_PROVIDER: "mock" | "openai";
  AUTH_MODE: "mock" | "supabase";
  HOTELBEDS_PROVIDER: "mock" | "hotelbeds";
  QUOTE_EXPORTS_BUCKET: string;
  QUOTE_REPOSITORY_MODE: "mock" | "supabase";
  appVersion: string;
  builtAt: string;
  gitSha: string;
  migrationHead: string;
};

export const getRuntimeSyncPayload = (): RuntimeSyncPayload => {
  const config = getRuntimeConfig();

  return {
    AI_PROVIDER: config.AI_PROVIDER,
    AUTH_MODE: config.AUTH_MODE,
    HOTELBEDS_PROVIDER: config.HOTELBEDS_PROVIDER,
    QUOTE_EXPORTS_BUCKET: config.QUOTE_EXPORTS_BUCKET,
    QUOTE_REPOSITORY_MODE: config.QUOTE_REPOSITORY_MODE,
    appVersion: webPackageJson.version,
    builtAt: RESOLVED_BUILD_AT,
    gitSha: resolveGitSha(),
    migrationHead: resolveMigrationHead(),
  };
};
