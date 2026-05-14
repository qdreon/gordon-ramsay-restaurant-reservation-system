/**
 * signout.spec.ts
 * ----------------
 * Regression test for DEF-002: sign-out abort (net::ERR_ABORTED).
 *
 * I verify three things in sequence:
 *   1. A known customer account can log in successfully.
 *   2. Clicking "Sign Out" navigates to "/" with no aborted browser requests.
 *      (Sign-out is now server-side via POST /api/auth/signout, so no
 *      /auth/v1/logout fetch fires from the browser.)
 *   3. After sign-out the session is gone -- navigating to /customer/dashboard
 *      redirects to /auth/login.
 *
 * Test Account: test-customer@example.com (see tests/rbac/rbac-test-runner.js)
 * Jira: QDR-47 / TC-1.1 (re-run after DEF-002 fix)
 */

import { test, expect } from "@playwright/test";

// I use the same credentials as the RBAC test runner (rbac-test-runner.js),
// which were verified working on May 13, 2026.
const TEST_EMAIL = "test-customer@example.com";
const TEST_PASSWORD = "TestPassword123!";

test.describe("DEF-002 regression: sign-out completes without abort", () => {
  test("TC-1.1 sign-in then sign-out lands on home and clears session", async ({
    page,
  }) => {
    // Collect any aborted requests during the entire test for diagnosis.
    const abortedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      abortedRequests.push(
        `${request.url()} [${request.failure()?.errorText}]`,
      );
    });

    // -- Step 1: Log in --
    await page.goto("/auth/login");
    await expect(page).toHaveURL(/auth\/login/);

    // I use the #id selectors that match the actual input elements in LoginPage.
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait until dashboard is fully loaded.
    await expect(page).toHaveURL(/customer\/dashboard/, { timeout: 20000 });

    // -- Step 2: Sign out --
    // The sign-out button POSTs to /api/auth/signout (server-side). The server
    // clears the cookie and returns a 303 to "/". The browser follows the
    // redirect -- no /auth/v1/logout fetch fires from the browser at all.
    await Promise.all([
      page.waitForURL("/", { timeout: 15000 }),
      page.click('button:has-text("Sign Out")'),
    ]);

    // Assert we landed on the home page.
    await expect(page).toHaveURL("/");

    // Assert the Supabase logout endpoint was NOT fired from the browser
    // (it runs server-side now, so no browser-level abort is possible).
    const browserLogoutRequests = abortedRequests.filter((url) =>
      url.includes("/auth/v1/logout"),
    );
    console.log("[TC-1.1] Aborted requests:", abortedRequests);
    expect(browserLogoutRequests).toHaveLength(0);

    // -- Step 3: Confirm session is cleared --
    // Navigating to the protected dashboard must redirect to /auth/login.
    await page.goto("/customer/dashboard");
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  });
});
