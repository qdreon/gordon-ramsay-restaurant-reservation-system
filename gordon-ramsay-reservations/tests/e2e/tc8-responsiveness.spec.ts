/**
 * tc8-responsiveness.spec.ts
 * --------------------------
 * QDR-50 / Subtask 7.5: Device & Responsiveness Testing
 *
 * I automate a lightweight viewport smoke test across mobile, tablet, and
 * desktop widths. The goal is to confirm the core customer home page and the
 * authenticated admin dashboard remain readable and do not introduce obvious
 * horizontal overflow at common device sizes.
 */

import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "test-admin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1024 },
] as const;

const ASSERT_TIMEOUT = 15_000;

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/admin\/dashboard/, { timeout: ASSERT_TIMEOUT });
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });

  expect(
    hasOverflow,
    "Page should not introduce visible horizontal overflow at this viewport",
  ).toBe(false);
}

for (const viewport of VIEWPORTS) {
  test.describe(`Responsiveness smoke: ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`homepage renders cleanly at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.goto("/");

      await expect(page.locator("h1").first()).toBeVisible({ timeout: ASSERT_TIMEOUT });
      await expect(page.locator('input[type="date"]').first()).toBeVisible({
        timeout: ASSERT_TIMEOUT,
      });
      await expect(page.locator('button[type="submit"]').first()).toBeVisible({
        timeout: ASSERT_TIMEOUT,
      });

      await assertNoHorizontalOverflow(page);
    });

    test(`admin dashboard renders cleanly at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/dashboard");

      await expect(
        page.locator('h2:has-text("System Status")').first(),
      ).toBeVisible({ timeout: ASSERT_TIMEOUT });

      await assertNoHorizontalOverflow(page);
    });
  });
}