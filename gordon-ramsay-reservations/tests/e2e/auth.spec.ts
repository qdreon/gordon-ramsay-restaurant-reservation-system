import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('TC-1.1 Registration requires consent and redirects to dashboard', async ({ page }) => {
    const email = `qa-auth-${Date.now()}@example.com`;
    const password = 'P@ssw0rd123!';

    await page.goto('/auth/register');

    await page.fill('#fullName', 'QA Auth Customer');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.fill('#confirmPassword', password);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    await page.check('input[type="checkbox"]');
    await expect(submitButton).toBeEnabled();
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/customer\/dashboard/);
  });

  test('TC-1.2 Login works for registered user', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'test-customer@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/customer\/dashboard/);
  });
});
