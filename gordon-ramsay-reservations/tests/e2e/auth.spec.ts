import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('TC-1.1 Registration requires consent and redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/register');
    // Try submitting without consent
    await page.fill('input[name="email"]', 'qa-customer-1@example.com');
    await page.fill('input[name="password"]', 'P@ssw0rd123!');
    await page.click('button[type="submit"]');
    // Expect validation message about consent or that we remain on the form
    await expect(page).toHaveURL(/auth\/register/);

    // Now check consent and submit
    const consent = await page.locator('input[type="checkbox"]');
    if (await consent.count() > 0) {
      await consent.first().check();
    }
    await page.click('button[type="submit"]');

    // After successful registration expect redirect to dashboard or login
    await expect(page).toHaveURL(/customer\/dashboard|auth\/login/);
  });

  test('TC-1.2 Login works for registered user', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'qa-customer-1@example.com');
    await page.fill('input[name="password"]', 'P@ssw0rd123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/customer\/dashboard/);
  });
});
