import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

loadEnvConfig(process.cwd());

const deployedBaseUrl = "https://gordon-ramsay-restaurant-reservation-system-e3ky64swr.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  // Phase 7 suites share seeded Supabase users and live reservation tables.
  // Run serially to avoid cross-file data races, auth-cookie collisions, and
  // artificial lock contention that can make otherwise valid QA checks flaky.
  workers: 1,
  use: {
    headless: false,
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ||
      process.env.BASE_URL ||
      deployedBaseUrl,
    // For screen recordings of grrrs-live-demo.spec.ts, prefer playwright.demo.config.ts
    // (video: "on", slowMo) or set video: "on" via test.use() in that spec.
    video: "retain-on-failure",
    actionTimeout: 15_000, // 15 second timeout before each action
    navigationTimeout: 15_000, // 15 second timeout for navigation
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // Default to the deployed site. Set BASE_URL only if you need to override it.
  webServer: undefined,
});
