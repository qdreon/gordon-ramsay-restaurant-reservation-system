import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('TC-1.1 Registration requires consent and redirects to dashboard', async ({ page }) => {
    const email = `qa-customer-${Date.now()}@example.com`;

    await page.goto('/auth/register');
    // Try submitting without consent
    await page.getByLabel('Full Name').fill('QA Customer');
    await page.getByLabel('Email Address').fill(email);
    await page.locator('#password').fill('P@ssw0rd123!');
    await page.locator('#confirmPassword').fill('P@ssw0rd123!');
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeDisabled();
    await expect(page).toHaveURL(/auth\/register/);

    // Now check consent and submit
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled();
    await page.getByRole('button', { name: 'Create Account' }).click();

    // After successful registration expect redirect to dashboard or login
    await expect(page).toHaveURL(/customer\/dashboard|auth\/login/, { timeout: 30000 });
  });

  test('TC-1.2 Login works for registered user', async ({ page }) => {
    const email = `qa-login-${Date.now()}@example.com`;

    const registerResponse = await page.request.post('/api/auth/register', {
      data: {
        email,
        password: 'P@ssw0rd123!',
        fullName: 'QA Login User',
        phone: '+15551234567',
        consentGiven: true,
      },
    });

    expect(registerResponse.ok()).toBeTruthy();

    await page.goto('/auth/login');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill('P@ssw0rd123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/customer\/dashboard/, { timeout: 30000 });
  });
});
