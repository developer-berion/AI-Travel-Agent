import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const DEFAULT_MIGRATION_HEAD = "20260310163000_quote_exports_storage.sql";

const getFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const selectLatestMigrationHead = (entries) =>
  [...entries]
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? null;

export const getReleaseCandidateGitSha = () =>
  getFirstNonEmpty(process.env.RELEASE_CANDIDATE_GIT_SHA) ??
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();

export const getReleaseCandidateMigrationHead = () => {
  const configuredMigrationHead = getFirstNonEmpty(
    process.env.RELEASE_CANDIDATE_MIGRATION_HEAD,
  );

  if (configuredMigrationHead) {
    return configuredMigrationHead;
  }

  const migrationsDirectory = path.resolve(
    process.cwd(),
    "supabase",
    "migrations",
  );
  const latestMigrationHead = selectLatestMigrationHead(
    readdirSync(migrationsDirectory),
  );

  return latestMigrationHead ?? DEFAULT_MIGRATION_HEAD;
};

export const assertRuntimeSync = async ({
  expectedModes,
  requestJson,
  stagingBaseUrl,
}) => {
  const expectedGitSha = getReleaseCandidateGitSha();
  const expectedMigrationHead = getReleaseCandidateMigrationHead();
  const { body: runtimeSync } = await requestJson(
    `${stagingBaseUrl}/api/runtime-sync`,
  );

  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(`assertion_failed:${message}`);
    }
  };

  assert(
    typeof runtimeSync?.gitSha === "string" && runtimeSync.gitSha.length > 0,
    "runtime_sync:git_sha_missing",
  );
  assert(
    runtimeSync.gitSha === expectedGitSha,
    `runtime_sync:git_sha_mismatch:${runtimeSync.gitSha}:${expectedGitSha}`,
  );
  assert(
    typeof runtimeSync?.migrationHead === "string" &&
      runtimeSync.migrationHead.length > 0,
    "runtime_sync:migration_head_missing",
  );
  assert(
    runtimeSync.migrationHead === expectedMigrationHead,
    `runtime_sync:migration_head_mismatch:${runtimeSync.migrationHead}:${expectedMigrationHead}`,
  );

  for (const [fieldName, expectedValue] of Object.entries(expectedModes)) {
    assert(
      runtimeSync?.[fieldName] === expectedValue,
      `runtime_sync:${fieldName.toLowerCase()}_mismatch:${runtimeSync?.[fieldName] ?? "missing"}:${expectedValue}`,
    );
  }

  return {
    expectedGitSha,
    expectedMigrationHead,
    runtimeSync,
  };
};
