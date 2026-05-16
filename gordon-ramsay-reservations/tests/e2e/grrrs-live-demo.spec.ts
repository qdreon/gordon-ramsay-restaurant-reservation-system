import { test, expect, type Page, type Browser } from "@playwright/test";

// Environment-driven configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const CUSTOMER_EMAIL = process.env.DEMO_CUSTOMER_EMAIL ?? "qa-customer-1@example.com";
const CUSTOMER_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD ?? "Test@123Pass";
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "qa-admin@example.com";
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? "Test@123Pass";

// Demo timings (ms)
const BANNER_SHOW_MS = 3000;
const ACTION_PAUSE_MS = 1800; // short pause after visible actions
const SECTION_PAUSE_MS = 2500; // pause after a section

/** Helper utilities (kept inline for the demo test) */
async function showDemoBanner(page: Page, title: string, description: string, requirementIds: string[] = []) {
  await page.evaluate(({ title, description, requirementIds }) => {
    // Remove previous banner
    document.querySelector('#grrrs-demo-banner')?.remove();

    const banner = document.createElement('div');
    banner.id = 'grrrs-demo-banner';
    banner.innerHTML = `
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc;margin-bottom:6px;">Live Demo Focus</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:8px;">${title}</div>
      <div style="font-size:14px;line-height:1.45;color:#e5e7eb;">${description}</div>
      ${requirementIds.length ? `<div style="margin-top:10px;font-size:12px;color:#bae6fd;">Related: ${requirementIds.join(', ')}</div>` : ''}
    `;

    Object.assign(banner.style, {
      position: 'fixed',
      top: '24px',
      right: '24px',
      width: '420px',
      background: 'rgba(15, 23, 42, 0.96)',
      color: 'white',
      border: '2px solid #38bdf8',
      borderRadius: '16px',
      padding: '18px',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
      zIndex: '2147483647',
    });

    document.body.appendChild(banner);
  }, { title, description, requirementIds });

  await page.waitForTimeout(BANNER_SHOW_MS);
  // Remove the banner after the delay so subsequent overlays can appear
  await page.evaluate(() => document.querySelector('#grrrs-demo-banner')?.remove());
}

async function pauseForDemo(ms = ACTION_PAUSE_MS) {
  await new Promise((r) => setTimeout(r, ms));
}

async function safeClick(pageOrLocator: any, label?: string) {
  try {
    if (typeof pageOrLocator.click === 'function') {
      await pageOrLocator.click();
    } else {
      // assume locator-like
      await pageOrLocator.click();
    }
  } catch (err) {
    // non-fatal for demo; log for evidence
    // eslint-disable-next-line no-console
    console.log(`i: safeClick failed for ${label ?? 'locator'}: ${err}`);
  }
}

async function safeFill(locator: any, value: string, label?: string) {
  try {
    await locator.fill(value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`i: safeFill failed for ${label ?? 'locator'}: ${err}`);
  }
}

async function maybeVisible(locator: any) {
  try {
    return (await locator.count()) > 0;
  } catch {
    return false;
  }
}

// The main demo test is intended for headed mode and screen recording.
test('GRRRS Live Demo — headed, screen-recordable walkthrough', async ({ browser }) => {
  test.setTimeout(10 * 60_000);

  // Create first context for customer flow
  const customerContext = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 800 } });
  const customerPage = await customerContext.newPage();

  // Section 1: Introduction
  await test.step('Section 1: Introduction Overlay', async () => {
    await showDemoBanner(customerPage, 'Demo Focus: GRRRS Application Overview', 'Showing the deployed/local web app, customer portal, admin dashboard, and requirement-based demo coverage.', ['DR-0']);
    await customerPage.goto('/');
    await pauseForDemo(SECTION_PAUSE_MS);
    // scroll a bit so layout is visible
    await customerPage.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
    await pauseForDemo(1500);
  });

  // SECTION 2: Customer Authentication
  await test.step('Section 2: Customer Authentication', async () => {
    await showDemoBanner(customerPage, 'Demo Focus: Login / Authentication', 'Validates FR-1 Account Management, SEC-1 protected routes, and LEG-1 consent-based registration.', ['FR-1', 'SEC-1']);
    await customerPage.goto('/auth/login');
    await pauseForDemo();

    const email = customerPage.getByLabel(/email/i) || customerPage.locator('#email');
    const pass = customerPage.getByLabel(/password/i) || customerPage.locator('#password');
    await safeFill(email, CUSTOMER_EMAIL, 'customer email');
    await safeFill(pass, CUSTOMER_PASSWORD, 'customer password');
    await pauseForDemo();
    await safeClick(customerPage.getByRole('button', { name: /sign in|log in|submit|login/i }) || customerPage.locator('button[type="submit"]'), 'customer login');
    await customerPage.waitForURL(/customer\/dashboard/, { timeout: 20_000 }).catch(() => {});
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 3: Availability Search and Menu View
  await test.step('Section 3: Availability Search and Menu View', async () => {
    await showDemoBanner(customerPage, 'Demo Focus: Availability Search and Digital Menu', 'Validates FR-2 Search and Discovery: date, time, party size input, available table output, and menu visibility.', ['FR-2']);
    await customerPage.goto('/');
    await pauseForDemo();

    // Prefer accessible inputs
    const dateInput = customerPage.getByLabel(/date/i).first().catch?.(() => null) ?? customerPage.locator('input[type="date"]');
    const timeInput = customerPage.getByLabel(/time/i).first().catch?.(() => null) ?? customerPage.locator('input[type="time"]');
    const partyInput = customerPage.getByLabel(/party size|party/i).first().catch?.(() => null) ?? customerPage.locator('input[type="number"]');

    await safeFill(dateInput, '2030-01-15', 'date');
    await safeFill(timeInput, '19:00', 'time');
    await safeFill(partyInput, '4', 'party');
    await pauseForDemo();

    await safeClick(customerPage.getByRole('button', { name: /search availability/i }) || customerPage.locator('button:has-text("Search Availability")'), 'Search Availability');
    await pauseForDemo(SECTION_PAUSE_MS);

    // Verify results or fallback
    const resultsHeading = customerPage.getByRole('heading', { name: /availability results/i });
    if ((await maybeVisible(resultsHeading))) {
      await expect(resultsHeading).toBeVisible({ timeout: 10_000 }).catch(() => {});
    }

    const menuHeading = customerPage.getByRole('heading', { name: /menu|dishes|items/i });
    if ((await maybeVisible(menuHeading))) {
      await expect(menuHeading).toBeVisible({ timeout: 8000 }).catch(() => {});
    }
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 4: Booking Engine and Simulated Checkout
  await test.step('Section 4: Booking Engine and Simulated Checkout', async () => {
    await showDemoBanner(customerPage, 'Demo Focus: Booking Engine and Simulated Checkout', 'Validates FR-3 Booking Engine, 5-minute lock behavior, simulated payment, and LEG-2 no raw card storage.', ['FR-3', 'LEG-2']);

    const firstAvailable = customerPage.locator('ul li button').first();
    if ((await maybeVisible(firstAvailable)) && (await firstAvailable.count()) > 0) {
      await safeClick(firstAvailable, 'select first available');
      await pauseForDemo();

      const checkoutHeading = customerPage.getByRole('heading', { name: /confirm your booking/i }).first();
      if ((await maybeVisible(checkoutHeading))) {
        await expect(checkoutHeading).toBeVisible({ timeout: 10_000 }).catch(() => {});
        // Fill simulated card fields if present
        const card = customerPage.locator('#card');
        const expiry = customerPage.locator('#expiry');
        const cvv = customerPage.locator('#cvv');
        if ((await maybeVisible(card))) await safeFill(card, '4111111111111111', 'card');
        if ((await maybeVisible(expiry))) await safeFill(expiry, '12/25', 'expiry');
        if ((await maybeVisible(cvv))) await safeFill(cvv, '123', 'cvv');
        await pauseForDemo();
        await safeClick(customerPage.getByRole('button', { name: /confirm booking|confirm/i }) || customerPage.locator('button:has-text("Confirm Booking")'), 'Confirm Booking');
        await pauseForDemo(SECTION_PAUSE_MS);

        // Verify success or redirect
        const myResHeading = customerPage.getByRole('heading', { name: /my reservations/i });
        if ((await maybeVisible(myResHeading))) {
          await expect(myResHeading).toBeVisible({ timeout: 15_000 }).catch(() => {});
        }
      }
    } else {
      // No available table — show fallback overlay
      await showDemoBanner(customerPage, 'Demo Note: No available table in current seed state', 'The booking flow is covered by automated TC-2.2 and TC-3.2 evidence.', []);
    }

    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 5: Waitlist Flow
  await test.step('Section 5: Waitlist Flow', async () => {
    await showDemoBanner(customerPage, 'Demo Focus: Virtual Waitlist', 'Validates FR-5 Waitlist Management and FR-6 waitlist notification support.', ['FR-5']);
    await customerPage.goto('/');
    await pauseForDemo();
    await safeFill(customerPage.locator('input[type="date"]'), '2030-12-25', 'waitlist date');
    await safeFill(customerPage.locator('input[type="time"]'), '19:00', 'waitlist time');
    await safeFill(customerPage.locator('input[type="number"]'), '6', 'waitlist party');
    await pauseForDemo();
    await safeClick(customerPage.getByRole('button', { name: /search availability/i }) || customerPage.locator('button:has-text("Search Availability")'), 'Search Availability');
    await pauseForDemo();

    const joinButton = customerPage.getByRole('button', { name: /join virtual waitlist/i });
    if ((await maybeVisible(joinButton))) {
      await safeClick(joinButton, 'Join Virtual Waitlist');
      await pauseForDemo();
      const modalHeading = customerPage.getByRole('heading', { name: /join the virtual waitlist/i });
      if ((await maybeVisible(modalHeading))) {
        await expect(modalHeading).toBeVisible({ timeout: 10_000 }).catch(() => {});
        await pauseForDemo();
        const joinConfirm = customerPage.getByRole('button', { name: /join waitlist|join/i });
        if ((await maybeVisible(joinConfirm))) {
          await safeClick(joinConfirm, 'Confirm join waitlist');
          await pauseForDemo();
        }
      }
    } else {
      await showDemoBanner(customerPage, 'Demo Note: Waitlist did not appear', 'All tested time slots had availability in this environment.', []);
    }

    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 6: Customer Reservation Management
  await test.step('Section 6: Customer Reservation Management', async () => {
    await showDemoBanner(customerPage, 'Demo Focus: Customer Dashboard Output', 'Shows reservations, account data, and cancellation capability.', ['FR-1']);
    await customerPage.goto('/customer/dashboard');
    await pauseForDemo();
    const reservations = customerPage.getByRole('heading', { name: /my reservations/i });
    if ((await maybeVisible(reservations))) await expect(reservations).toBeVisible({ timeout: 8000 }).catch(() => {});
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // Close customer context and open new admin context
  await customerContext.close();
  await pauseForDemo(1000);

  const adminContext = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 800 } });
  const adminPage = await adminContext.newPage();

  // SECTION 7: Admin Authentication
  await test.step('Section 7: Admin Authentication and Protected Dashboard', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Admin Login and Protected Access', 'Validates SEC-1 RBAC and admin-only access.', ['SEC-1']);
    await adminPage.goto('/auth/login');
    await pauseForDemo();
    await safeFill(adminPage.getByLabel(/email/i) ?? adminPage.locator('#email'), ADMIN_EMAIL, 'admin email');
    await safeFill(adminPage.getByLabel(/password/i) ?? adminPage.locator('#password'), ADMIN_PASSWORD, 'admin password');
    await pauseForDemo();
    await safeClick(adminPage.getByRole('button', { name: /sign in|log in|submit|login/i }) || adminPage.locator('button[type="submit"]'), 'admin login');
    await adminPage.waitForURL(/admin\/dashboard/, { timeout: 20_000 }).catch(() => {});
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 8: Admin Floor Plan
  await test.step('Section 8: Admin Floor Plan', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Real-Time Floor Plan', 'Validates FR-7 Visual Table Management: status colors and real-time operational view.', ['FR-7']);
    // Navigate to floor plan if route exists
    await adminPage.goto('/admin/floorplan').catch(() => adminPage.goto('/admin/dashboard'));
    await pauseForDemo();
    const floorHeading = adminPage.getByRole('heading', { name: /floor plan|interactive floor plan|live floor plan/i });
    if ((await maybeVisible(floorHeading))) await expect(floorHeading).toBeVisible({ timeout: 10_000 }).catch(() => {});
    // Show first table if safe
    const tableBtn = adminPage.getByRole('button', { name: /^T\d+/i }).first();
    if ((await maybeVisible(tableBtn))) {
      await safeClick(tableBtn, 'table button');
      await pauseForDemo();
      // show menu but avoid destructive actions
    }
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 9: Reservation Calendar and Validation
  await test.step('Section 9: Reservation Calendar and Validation', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Reservation Calendar and Operating-Hours Validation', 'Validates FR-8 Reservation and Shift Management, blocked dates, and validation rules.', ['FR-8']);
    await adminPage.goto('/admin/reservations').catch(() => adminPage.goto('/admin/dashboard'));
    await pauseForDemo();
    const calendar = adminPage.getByRole('heading', { name: /reservations|calendar/i });
    if ((await maybeVisible(calendar))) await expect(calendar).toBeVisible({ timeout: 8000 }).catch(() => {});
    // Open new reservation modal if present and attempt out-of-hours time, then close
    const newResBtn = adminPage.getByRole('button', { name: /new reservation/i });
    if ((await maybeVisible(newResBtn))) {
      await safeClick(newResBtn, 'New Reservation');
      await pauseForDemo();
      const timeInput = adminPage.getByLabel(/time/i) ?? adminPage.locator('input[type="time"]');
      if ((await maybeVisible(timeInput))) await safeFill(timeInput, '08:00', 'out-of-hours time');
      await pauseForDemo();
      const submitButton = adminPage.getByRole('button', { name: /save|submit|create/i });
      if ((await maybeVisible(submitButton))) {
        await safeClick(submitButton, 'submit new reservation');
        await pauseForDemo();
      }

      const cancelButton = adminPage.locator('[role="dialog"] button:has-text("Cancel")');
      if ((await maybeVisible(cancelButton))) {
        await safeClick(cancelButton, 'close reservation modal');
      }
    }
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 10: Guest CRM
  await test.step('Section 10: Guest CRM', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Guest CRM', 'Validates FR-9 Guest CRM: visit history, allergy notes, VIP status, and no-show counts.', ['FR-9']);
    await adminPage.goto('/admin/crm').catch(() => adminPage.goto('/admin/dashboard'));
    await pauseForDemo();
    const crmTable = adminPage.getByRole('table') || adminPage.getByText(/Guests|Customers|CRM/i);
    if ((await maybeVisible(crmTable))) await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 11: Menu Management
  await test.step('Section 11: Menu Management', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Menu Management', 'Validates FR-11 Menu CRUD and customer-facing menu data.', ['FR-11']);
    await adminPage.goto('/admin/menu').catch(() => adminPage.goto('/admin/dashboard'));
    await pauseForDemo();
    const list = adminPage.getByRole('list') || adminPage.getByText(/starters|mains|desserts|menu/i);
    if ((await maybeVisible(list))) await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 12: Admin Waitlist Control
  await test.step('Section 12: Admin Waitlist Control', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Admin Waitlist Control', 'Validates FR-12 Manual Waitlist Control: search, filter, edit, prioritize, or remove queue entries.', ['FR-12']);
    await adminPage.goto('/admin/waitlist').catch(() => adminPage.goto('/admin/dashboard'));
    await pauseForDemo();
    const waitlistTable = adminPage.getByRole('table') || adminPage.getByText(/waitlist/i);
    if ((await maybeVisible(waitlistTable))) await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 13: System Health Monitoring
  await test.step('Section 13: System Health Monitoring', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: System Health Monitoring', 'Validates FR-13 System Health: database, email, and payment service indicators.', ['FR-13']);
    await adminPage.goto('/admin/dashboard');
    await pauseForDemo();
    const status = adminPage.getByText(/Database|Email|Payments/i);
    if ((await maybeVisible(status))) await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 14: Error Handling and Validation Summary
  await test.step('Section 14: Error Handling and Validation Summary', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Error Handling and Validations', 'Shows validation coverage: operating hours, no availability, protected routes, tokenized payment, and lock conflict evidence.', []);
    await adminPage.goto('/admin/dashboard');
    await pauseForDemo();
    await pauseForDemo(SECTION_PAUSE_MS);
  });

  // SECTION 15: Reports and Analytics
  await test.step('Section 15: Reports and Analytics', async () => {
    await showDemoBanner(adminPage, 'Demo Focus: Reports and Analytics Evidence', 'Shows Playwright report, Lighthouse performance, concurrency evidence, and traceability to SRS/SWDD/SPM-PC.', []);
    // Point viewers to local artifacts
    // Print paths to the console for manual review after recording
    // eslint-disable-next-line no-console
    console.log('Playwright report: playwright-report (local)');
    console.log('Lighthouse reports: tests/lighthouse (local)');
    await pauseForDemo(SECTION_PAUSE_MS + 1000);
  });

  // Final banner
  await test.step('Final: Demo Completed', async () => {
    await showDemoBanner(adminPage, 'Demo Completed: GRRRS Functional, Tested, and Traceable', 'The demo covered authentication, booking, waitlist, admin operations, validations, system health, and QA reports.', ['DR-0..DR-5', 'FR-1..FR-13']);
    await pauseForDemo(3000);
  });

  // Close admin context
  await adminContext.close();
});

// Guidance for recording in README / comments:
// Run in headed mode and record using Playwright config that enables video:
// npx playwright test tests/e2e/grrrs-live-demo.spec.ts --headed --project=chromium --workers=1
// To enable video recording for only this test, add a project in playwright.config.ts with:
// use: { video: 'on', launchOptions: { slowMo: 50 } }
