/**
 * playwright.local.config.ts
 * --------------------------
 * Playwright configuration for running the full e2e suite against the local
 * Next.js dev server. The webServer block starts the app automatically before
 * tests and stops it afterwards.
 */

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  workers: 1,
  use: {
    headless: false,
    baseURL: "http://localhost:3000",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
