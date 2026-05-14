import { test, expect } from '@playwright/test';

const REGISTRATION_EMAIL = `qa-customer-${Date.now()}@example.com`;
const REGISTRATION_PASSWORD = 'P@ssw0rd123!';
const CUSTOMER_EMAIL = 'test-customer@example.com';
const CUSTOMER_PASSWORD = 'TestPassword123!';

test.describe('Auth flows', () => {
  test('TC-1.1 Registration requires consent and redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForSelector('#email', { timeout: 15000 });

    await page.fill('#fullName', 'QA Customer');
    await page.fill('#email', REGISTRATION_EMAIL);
    await page.fill('#password', REGISTRATION_PASSWORD);
    await page.fill('#confirmPassword', REGISTRATION_PASSWORD);
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/customer\/dashboard/, { timeout: 20000 });
  });

  test('TC-1.2 Login works for registered user', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('#email', { timeout: 15000 });

    await page.fill('#email', CUSTOMER_EMAIL);
    await page.fill('#password', CUSTOMER_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/customer\/dashboard/, { timeout: 20000 });
  });
});
