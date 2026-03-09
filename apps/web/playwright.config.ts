import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  fullyParallel: true,
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    cwd: currentDirectory,
    env: {
      AI_PROVIDER: "mock",
      AUTH_MODE: "mock",
      QUOTE_REPOSITORY_MODE: "mock",
    },
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
