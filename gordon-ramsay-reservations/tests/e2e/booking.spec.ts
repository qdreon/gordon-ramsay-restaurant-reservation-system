import { test, expect } from '@playwright/test';

test.describe('Booking flows', () => {
  test('TC-2.1 Search availability and open CheckoutModal', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="date"]', '2031-03-15');
    await page.fill('input[type="time"]', '19:00');
    await page.fill('input[type="number"]', '2');

    await page.click('button:has-text("Search Availability")');
    await expect(page.locator('h2:has-text("Availability Results")')).toBeVisible({
      timeout: 15000,
    });

    const optionButtons = page.locator('ul li button');
    const optionCount = await optionButtons.count();

    if (optionCount === 0) {
      test.skip(true, 'No availability options were returned for this live test slot.');
      return;
    }

    await optionButtons.first().click();

    await expect(page.locator('h2:has-text("Confirm Your Booking")')).toBeVisible({
      timeout: 15000,
    });
  });
});
