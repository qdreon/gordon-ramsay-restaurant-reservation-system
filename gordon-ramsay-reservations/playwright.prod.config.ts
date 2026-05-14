/**
 * playwright.prod.config.ts
 * --------------------------
 * Playwright configuration for running security/RBAC tests against the
 * production build (`next start`) instead of the webpack dev server.
 *
 * WHY THIS EXISTS (DEF-004):
 *   Next.js middleware is correctly implemented (verified 2026-05-12) but
 *   the hot-reload race condition in `next dev --webpack` prevents Playwright
 *   from triggering the middleware for fresh browser contexts.  Running against
 *   a production build (`next build --webpack && next start`) eliminates the
 *   dev server cache/reload race and allows middleware to intercept every request.
 *
 * USAGE:
 *   1. Build first (one-time until code changes):
 *        npm run build
 *   2. Run the security suite against the production server:
 *        npm run test:e2e:prod
 *      This starts `next start` automatically, runs the tests, then tears it down.
 *
 * Jira: QDR-50 / DEF-004 / Subtask 7.4
 */

import { defineConfig } from "@playwright/test";

export default defineConfig({
  // Only run the security test file
  testDir: "./tests/e2e",
  testMatch: ["**/tc7-security.spec.ts"],
  timeout: 90_000,
  workers: 1,
  use: {
    headless: true,
    baseURL: process.env.BASE_URL || "http://localhost:3001",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // Auto-start the production server on a different port (3001) so it does not
  // clash with a running dev server on 3000.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // `next start` serves the pre-built .next output.
        // Run `npm run build` before executing this config.
        command: "npx next start --port 3001",
        url: "http://localhost:3001",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
