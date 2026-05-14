import { test, expect } from '@playwright/test';

const SEARCH_DATE = '2026-12-15';
const SEARCH_TIME = '19:00';
const SEARCH_PARTY_SIZE = '2';

test.describe('Booking flows', () => {
  test('TC-2.1 Search availability and open CheckoutModal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[type="date"]', { timeout: 15000 });

    await page.fill('input[type="date"]', SEARCH_DATE);
    await page.fill('input[type="time"]', SEARCH_TIME);
    await page.fill('input[type="number"]', SEARCH_PARTY_SIZE);

    const availabilityResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/api/availability'),
      { timeout: 20000 },
    );
    await page.click('button[type="submit"]');

    await availabilityResponse;

    await expect(
      page.locator('h2:has-text("Availability Results")'),
    ).toBeVisible({ timeout: 15000 });

    const availabilityButton = page.locator('button[data-test="availability-item"]');
    const noAvailabilityMessage = page.locator(
      'p:has-text("No available options found.")',
    );
    const waitlistButton = page.locator(
      'button:has-text("Join Virtual Waitlist"), button:has-text("Waitlist Full"), button:has-text("Checking capacity")',
    );

    const optionCount = await availabilityButton.count();
    const noAvailabilityCount = await noAvailabilityMessage.count();
    const waitlistCount = await waitlistButton.count();

    if (optionCount === 0) {
      expect(
        optionCount + noAvailabilityCount + waitlistCount,
        'Expected either table options, a no-availability message, or a waitlist button after search',
      ).toBeGreaterThan(0);

      if (noAvailabilityCount > 0) {
        await expect(noAvailabilityMessage).toBeVisible({ timeout: 15000 });
      } else {
        await expect(waitlistButton.first()).toBeVisible({ timeout: 15000 });
      }
      return;
    }

    await availabilityButton.first().click();

    const modal = page.locator('[data-test="checkout-modal"]');
    await expect(modal).toBeVisible({ timeout: 15000 });
    await expect(
      modal.locator('h2:has-text("Confirm Your Booking")'),
    ).toBeVisible({ timeout: 15000 });
  });
});
