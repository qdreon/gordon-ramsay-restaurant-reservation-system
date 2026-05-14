import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
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
