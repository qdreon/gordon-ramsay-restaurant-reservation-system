import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
test.skip(!hasSupabaseEnv, "E2E booking tests require Supabase environment variables.");

test.describe('Booking flows', () => {
  test('TC-2.1 Search availability and open CheckoutModal', async ({ page }) => {
    await page.goto('/');
    // Fill date/time/party fields if present
    if ((await page.locator('input[name="date"]').count()) > 0) {
      await page.fill('input[name="date"]', '2026-06-01');
    }
    if ((await page.locator('input[name="time"]').count()) > 0) {
      await page.fill('input[name="time"]', '19:00');
    }
    if ((await page.locator('select[name="partySize"]').count()) > 0) {
      await page.selectOption('select[name="partySize"]', '2');
    }

    await page.click('button:has-text("Search Availability")');

    // Wait for results container and attempt to open a booking
    const result = page.locator('button:has-text("Book")');
    if (await result.count() === 0) {
      // Try a generic selector for availability item
      const item = page.locator('[data-test="availability-item"]');
      if (await item.count() > 0) {
        await item.first().click();
      }
    } else {
      await result.first().click();
    }

    // Expect checkout modal to appear
    const modal = page.locator('[data-test="checkout-modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });
});
