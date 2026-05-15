import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  // Phase 7 suites share seeded Supabase users and live reservation tables.
  // Run serially to avoid cross-file data races, auth-cookie collisions, and
  // artificial lock contention that can make otherwise valid QA checks flaky.
  workers: 1,
  use: {
    headless: true,
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // I auto-start the Next.js dev server when no BASE_URL override is provided.
  // This lets the test suite run without a manually started server.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx next dev --webpack",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
