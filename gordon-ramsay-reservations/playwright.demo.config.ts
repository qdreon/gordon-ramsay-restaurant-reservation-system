/**
 * Playwright configuration for the GRRRS live demo recording.
 * Enables video, trace, and slowMo for screen-recordable headed runs.
 */

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

loadEnvConfig(process.cwd());

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "grrrs-live-demo.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 600_000,
  expect: {
    timeout: 20_000,
  },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    headless: false,
    baseURL,
    video: "on",
    trace: "on",
    screenshot: "on",
    actionTimeout: 20_000,
    navigationTimeout: 20_000,
    launchOptions: {
      slowMo: Number(process.env.DEMO_SLOW_MO ?? 120),
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
