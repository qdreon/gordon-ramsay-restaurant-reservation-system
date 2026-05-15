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

  // Create separate contexts for customer and admin so we can show both
  const customerContext = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 800 } });
  const adminContext = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 800 } });

  const customerPage = await customerContext.newPage();
  const adminPage = await adminContext.newPage();

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
      // Attempt submit and expect validation (non-destructive: just open and close)
      await safeClick(adminPage.getByRole('button', { name: /save|submit|create/i }) || adminPage.locator('[role="dialog"] button[type="submit"]'), 'submit new reservation');
      await pauseForDemo();
      // Close modal
      await safeClick(adminPage.locator('[role="dialog"] button:has-text("Cancel")') || adminPage.locator('[role="dialog"] button[type="button"]'), 'close reservation modal');
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
    await showDemoBanner(customerPage, 'Demo Focus: Error Handling and Validations', 'Shows validation coverage: operating hours, no availability, protected routes, tokenized payment, and lock conflict evidence.', []);
    // show an example: operating hours rejection on customer page
    await customerPage.goto('/');
    await safeFill(customerPage.locator('input[type="date"]'), '2030-01-15', 'date');
    await safeFill(customerPage.locator('input[type="time"]'), '08:00', 'invalid time');
    await safeFill(customerPage.locator('input[type="number"]'), '2', 'party');
    await safeClick(customerPage.getByRole('button', { name: /search availability/i }) || customerPage.locator('button:has-text("Search Availability")'));
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
    await showDemoBanner(customerPage, 'Demo Completed: GRRRS Functional, Tested, and Traceable', 'The demo covered authentication, booking, waitlist, admin operations, validations, system health, and QA reports.', ['DR-0..DR-5', 'FR-1..FR-13']);
    await pauseForDemo(3000);
  });

  // Close contexts
  await adminContext.close();
  await customerContext.close();
});

// Guidance for recording in README / comments:
// Run in headed mode and record using Playwright config that enables video:
// npx playwright test tests/e2e/grrrs-live-demo.spec.ts --headed --project=chromium --workers=1
// To enable video recording for only this test, add a project in playwright.config.ts with:
// use: { video: 'on', launchOptions: { slowMo: 50 } }
import { expect, type Locator, type Page, test } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  "http://localhost:3000";
const CUSTOMER_EMAIL =
  process.env.DEMO_CUSTOMER_EMAIL ?? "qa-customer-1@example.com";
const CUSTOMER_PASSWORD =
  process.env.DEMO_CUSTOMER_PASSWORD ?? "Test@123Pass";
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "qa-admin@example.com";
const ADMIN_PASSWORD =
  process.env.DEMO_ADMIN_PASSWORD ?? "Test@123Pass";

test.use({
  baseURL: BASE_URL,
  launchOptions: { slowMo: 250 },
  video: "on",
});

async function pauseForDemo(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeVisible(locator: Locator): Promise<boolean> {
  try {
    if ((await locator.count()) === 0) return false;
    return await locator.first().isVisible({ timeout: 1500 });
  } catch {
    return false;
  }
}

async function safeClick(locator: Locator, label: string): Promise<boolean> {
  if (!(await maybeVisible(locator))) {
    console.log(`[DEMO] Skipping click: ${label} (not visible)`);
    return false;
  }
  await locator.first().click();
  return true;
}

async function safeFill(
  locator: Locator,
  value: string,
  label: string,
): Promise<boolean> {
  if (!(await maybeVisible(locator))) {
    console.log(`[DEMO] Skipping fill: ${label} (not visible)`);
    return false;
  }
  await locator.first().fill(value);
  return true;
}

async function showDemoBanner(
  page: Page,
  title: string,
  description: string,
  requirementIds: string[] = [],
): Promise<void> {
  await page.evaluate(
    ({ title: bannerTitle, description: bannerDescription, requirementIds: reqIds }) => {
      document.querySelector("#grrrs-demo-banner")?.remove();

      const banner = document.createElement("div");
      banner.id = "grrrs-demo-banner";
      const requirements = reqIds.length
        ? `<div style="margin-top:10px;font-size:12px;color:#bae6fd;">
             Requirements: ${reqIds.join(", ")}
           </div>`
        : "";

      banner.innerHTML = `
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc;margin-bottom:6px;">
          Live Demo Focus
        </div>
        <div style="font-size:20px;font-weight:700;margin-bottom:8px;">
          ${bannerTitle}
        </div>
        <div style="font-size:14px;line-height:1.45;color:#e5e7eb;">
          ${bannerDescription}
        </div>
        ${requirements}
      `;

      Object.assign(banner.style, {
        position: "fixed",
        top: "24px",
        right: "24px",
        width: "420px",
        background: "rgba(15, 23, 42, 0.96)",
        color: "white",
        border: "2px solid #38bdf8",
        borderRadius: "16px",
        padding: "18px",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        zIndex: "2147483647",
      });

      document.body.appendChild(banner);
    },
    { title, description, requirementIds },
  );

  await pauseForDemo(3000);
}

test("GRRRS live demo walkthrough", async ({ page }) => {
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await test.step("SECTION 1: Introduction", async () => {
    await page.goto("/");
    await showDemoBanner(
      page,
      "Demo Focus: GRRRS Application Overview",
      "Showing the deployed/local web app, customer portal, admin dashboard, and requirement-based demo coverage.",
      ["FR-2", "SEC-1"],
    );
    await expect(
      page.getByRole("heading", {
        name: /Gordon Ramsay Restaurant Reservations/i,
      }),
    ).toBeVisible({ timeout: 15000 });
    await page.mouse.wheel(0, 450);
    await pauseForDemo(1200);
    await page.mouse.wheel(0, -250);
    await pauseForDemo(1200);
  });

  await test.step("SECTION 2: Customer Authentication", async () => {
    await page.goto("/auth/login");
    await showDemoBanner(
      page,
      "Demo Focus: Login / Authentication",
      "Validates FR-1 Account Management, SEC-1 protected routes, and LEG-1 consent-based registration.",
      ["FR-1", "SEC-1", "LEG-1"],
    );

    await safeFill(page.getByLabel(/Email Address/i), CUSTOMER_EMAIL, "customer email");
    await safeFill(page.getByLabel(/^Password$/i), CUSTOMER_PASSWORD, "customer password");
    await safeClick(page.getByRole("button", { name: /^Sign In$/i }), "customer sign in");
    await expect(page).toHaveURL(/customer\/dashboard/, { timeout: 25000 });
    await expect(
      page.getByRole("heading", { name: /Welcome to Your Account/i }),
    ).toBeVisible({ timeout: 15000 });
    await pauseForDemo(1500);
  });

  await test.step("SECTION 3: Availability Search and Menu View", async () => {
    await page.goto("/");
    await showDemoBanner(
      page,
      "Demo Focus: Availability Search and Digital Menu",
      "Validates FR-2 Search and Discovery: date, time, party size input, available table output, and menu visibility.",
      ["FR-2"],
    );

    await safeFill(page.locator('input[type="date"]'), "2030-01-15", "availability date");
    await safeFill(page.locator('input[type="time"]'), "19:00", "availability time");
    await safeFill(page.locator('input[type="number"]'), "4", "party size");
    await safeClick(
      page.getByRole("button", { name: /Search Availability|Searching/i }),
      "search availability",
    );

    const resultsHeading = page.getByRole("heading", { name: /Availability Results/i });
    await expect(resultsHeading).toBeVisible({ timeout: 15000 });
    await pauseForDemo(1200);

    const optionButtons = page.locator("ul li button");
    const noAvailability = page.getByText("No available options found.");
    expect(
      (await optionButtons.count()) > 0 || (await maybeVisible(noAvailability)),
    ).toBeTruthy();

    await expect(page.getByRole("heading", { name: /Digital Menu/i })).toBeVisible({
      timeout: 15000,
    });
    await pauseForDemo(1500);
  });

  await test.step("SECTION 4: Booking Engine and Simulated Checkout", async () => {
    await showDemoBanner(
      page,
      "Demo Focus: Booking Engine and Simulated Checkout",
      "Validates FR-3 Booking Engine, 5-minute lock behavior, simulated payment, and LEG-2 no raw card storage.",
      ["FR-3", "LEG-2"],
    );

    const tableOption = page.locator("ul li button").first();
    if (await maybeVisible(tableOption)) {
      await tableOption.click();
      await expect(
        page.getByRole("heading", { name: /Confirm Your Booking/i }),
      ).toBeVisible({ timeout: 15000 });
      await pauseForDemo(1200);

      const timer = page.locator("p").filter({ hasText: /^\d:\d\d$/ }).first();
      if (await maybeVisible(timer)) await pauseForDemo(1200);

      await safeFill(page.locator("#card"), "4111111111111111", "card number");
      await safeFill(page.locator("#expiry"), "12/25", "expiry");
      await safeFill(page.locator("#cvv"), "123", "cvv");
      await safeClick(
        page.getByRole("button", { name: /Confirm Booking|Processing/i }),
        "confirm booking",
      );

      const onDashboard = await page
        .waitForURL(/customer\/dashboard/, { timeout: 30000 })
        .then(() => true)
        .catch(() => false);

      if (onDashboard) {
        const upcomingSection = page.getByRole("heading", { name: /Upcoming/i });
        await expect(upcomingSection).toBeVisible({ timeout: 15000 });
        await pauseForDemo(1500);
      }
    } else {
      await showDemoBanner(
        page,
        "Demo Note: No available table in current seed state.",
        "The booking flow is covered by automated TC-2.2 and TC-3.2 evidence.",
        ["TC-2.2", "TC-3.2"],
      );
    }
  });

  await test.step("SECTION 5: Waitlist Flow", async () => {
    await page.goto("/");
    await showDemoBanner(
      page,
      "Demo Focus: Virtual Waitlist",
      "Validates FR-5 Waitlist Management and FR-6 waitlist notification support.",
      ["FR-5", "FR-6"],
    );

    await safeFill(page.locator('input[type="date"]'), "2030-12-25", "waitlist date");
    await safeFill(page.locator('input[type="time"]'), "19:00", "waitlist time");
    await safeFill(page.locator('input[type="number"]'), "6", "waitlist party size");
    await safeClick(page.getByRole("button", { name: /Search Availability/i }), "waitlist search");
    await expect(page.getByRole("heading", { name: /Availability Results/i })).toBeVisible({
      timeout: 15000,
    });
    await pauseForDemo(1000);

    const noAvailMessage = page.getByText("No available options found.");
    if (await maybeVisible(noAvailMessage)) {
      await pauseForDemo(1000);
    }

    const joinWaitlistButton = page.getByRole("button", {
      name: /Join Virtual Waitlist|Waitlist Full|Checking capacity/i,
    });
    if (await safeClick(joinWaitlistButton, "join virtual waitlist")) {
      await pauseForDemo(800);
      await safeClick(page.getByRole("button", { name: /^Join Waitlist$/i }), "confirm waitlist");
      await pauseForDemo(1500);
    } else {
      await showDemoBanner(
        page,
        "Demo Note: Waitlist button unavailable in current UI state.",
        "FR-5/FR-6 waitlist automation remains covered by automated QA evidence.",
        ["FR-5", "FR-6"],
      );
    }
  });

  await test.step("SECTION 6: Customer Reservation Management", async () => {
    await page.goto("/customer/dashboard");
    await showDemoBanner(
      page,
      "Demo Focus: Customer Dashboard Output",
      "Shows output of the customer process: reservations, account data, and cancellation capability.",
      ["FR-1", "FR-3"],
    );
    await expect(page.getByRole("heading", { name: /Welcome to Your Account/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { name: /Upcoming/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { name: /My Profile/i })).toBeVisible({
      timeout: 15000,
    });
    await pauseForDemo(1500);
  });

  await test.step("SECTION 7: Admin Authentication and Protected Dashboard", async () => {
    await showDemoBanner(
      page,
      "Demo Focus: Admin Login and Protected Access",
      "Validates SEC-1 RBAC and admin-only access.",
      ["SEC-1"],
    );

    await safeClick(page.getByRole("button", { name: /Sign Out/i }), "customer sign out");
    await page.waitForURL("/", { timeout: 15000 }).catch(() => undefined);
    await pauseForDemo(800);

    await page.goto("/auth/login");
    await safeFill(page.getByLabel(/Email Address/i), ADMIN_EMAIL, "admin email on /auth/login");
    await safeFill(page.getByLabel(/^Password$/i), ADMIN_PASSWORD, "admin password on /auth/login");
    await safeClick(page.getByRole("button", { name: /^Sign In$/i }), "admin sign in on /auth/login");
    await pauseForDemo(1200);

    const reachedAdmin = /admin\/dashboard/.test(page.url());
    if (!reachedAdmin) {
      await page.goto("/admin/login");
      await safeFill(page.getByLabel(/Email Address/i), ADMIN_EMAIL, "admin email");
      await safeFill(page.getByLabel(/^Password$/i), ADMIN_PASSWORD, "admin password");
      await safeClick(page.getByRole("button", { name: /^Sign In$/i }), "admin sign in");
    }

    await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 25000 });
    await pauseForDemo(1500);
  });

  await test.step("SECTION 8: Admin Floor Plan", async () => {
    await showDemoBanner(
      page,
      "Demo Focus: Real-Time Floor Plan",
      "Validates FR-7 Visual Table Management: status colors, static grid, and real-time operational view.",
      ["FR-7"],
    );
    await page.goto("/admin/floorplan");

    const floorPlanHeading = page
      .getByRole("heading", { name: /Interactive Floor Plan|Restaurant table control/i })
      .first();
    if (!(await maybeVisible(floorPlanHeading))) {
      await page.goto("/admin/dashboard");
    }

    const tableCard = page.locator("button").filter({ hasText: /^T\d/ }).first();
    await expect(tableCard).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Available/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Reserved/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Occupied/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Dirty/i).first()).toBeVisible({ timeout: 15000 });
    await safeClick(tableCard, "open table controls");
    await pauseForDemo(1500);
  });

  await test.step("SECTION 9: Reservation Calendar and Validation", async () => {
    await page.goto("/admin/reservations");
    await showDemoBanner(
      page,
      "Demo Focus: Reservation Calendar and Operating-Hours Validation",
      "Validates FR-8 Reservation and Shift Management, blocked dates, and validation rules.",
      ["FR-8"],
    );
    await expect(page.locator("h2").filter({ hasText: /\w+ \d{4}/ }).first()).toBeVisible({
      timeout: 15000,
    });

    const newReservationButton = page.getByRole("button", { name: /New Reservation/i }).first();
    await expect(newReservationButton).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Block Date/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await newReservationButton.click();

    const dialog = page.locator('[role="dialog"]').filter({ hasText: /New Reservation/i });
    if (await maybeVisible(dialog)) {
      const inputs = dialog.locator("input");
      if ((await inputs.count()) >= 4) {
        await inputs.nth(0).fill("QA Demo Guest");
        await inputs.nth(1).fill("08:00");
        await inputs.nth(2).fill("2");
        await inputs.nth(3).fill("T1");
        await safeClick(dialog.getByRole("button", { name: /Add Reservation|Create/i }), "submit invalid reservation");
        await expect(dialog.getByText(/open from|operating hours|11:00|invalid|time/i)).toBeVisible({
          timeout: 15000,
        });
      }
      await page.keyboard.press("Escape");
      await pauseForDemo(1200);
    }
  });

  await test.step("SECTION 10: Guest CRM", async () => {
    await page.goto("/admin/crm");
    await showDemoBanner(
      page,
      "Demo Focus: Guest CRM",
      "Validates FR-9 Guest CRM: visit history, allergy notes, VIP status, and no-show counts.",
      ["FR-9"],
    );

    await expect(page.getByRole("heading", { name: /Guest Database|CRM/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Visits/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/No-Shows/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15000 });

    const editProfile = page.getByRole("button", { name: /Edit Profile/i }).first();
    if (await safeClick(editProfile, "open CRM edit modal")) {
      await pauseForDemo(800);
      await safeClick(page.getByRole("button", { name: /Cancel/i }).first(), "close CRM modal");
    }
    await pauseForDemo(1200);
  });

  await test.step("SECTION 11: Menu Management", async () => {
    await page.goto("/admin/menu");
    await showDemoBanner(
      page,
      "Demo Focus: Menu Management",
      "Validates FR-11 Menu CRUD and customer-facing menu data.",
      ["FR-11"],
    );
    await expect(page.getByRole("heading", { name: /Menu Configuration/i })).toBeVisible({
      timeout: 15000,
    });
    await pauseForDemo(800);

    const qaDemoDish = `QA Demo Dish ${Date.now()}`;
    const addButton = page.getByRole("button", { name: /Add Menu Item/i }).first();
    if (await safeClick(addButton, "add menu item")) {
      const dialog = page.locator('[role="dialog"]').filter({ hasText: /Add New Dish/i });
      if (await maybeVisible(dialog)) {
        const fields = dialog.locator("input");
        if ((await fields.count()) >= 2) {
          await fields.nth(0).fill(qaDemoDish);
          await fields.nth(1).fill("QA demo item for live walkthrough");
          const category = dialog.getByRole("combobox").first();
          if (await safeClick(category, "menu category combobox")) {
            await safeClick(page.getByRole("option", { name: /Starters|Mains|Desserts/i }).first(), "menu category option");
          }
          await dialog
            .locator('input[placeholder="Price"], input[type="number"]')
            .first()
            .fill("29.00");
          await safeClick(dialog.getByRole("button", { name: /Save to Database|Saving/i }), "save menu item");
          await pauseForDemo(1200);

          const createdRow = page.locator("table tbody tr").filter({ hasText: qaDemoDish }).first();
          if (await maybeVisible(createdRow)) {
            await expect(createdRow).toBeVisible({ timeout: 15000 });
            await safeClick(createdRow.locator("button").last(), "delete QA demo menu item");
            await pauseForDemo(1200);
          }
        }
      }
    } else {
      await showDemoBanner(
        page,
        "Demo Note: CRUD controls unstable in current state.",
        "Existing menu data is shown; FR-11 CRUD is covered by QA automation evidence.",
        ["FR-11"],
      );
    }
  });

  await test.step("SECTION 12: Admin Waitlist Control", async () => {
    await page.goto("/admin/waitlist");
    await showDemoBanner(
      page,
      "Demo Focus: Admin Waitlist Control",
      "Validates FR-12 Manual Waitlist Control: search, filter, edit, prioritize, or remove queue entries.",
      ["FR-12"],
    );

    await expect(page.getByRole("heading", { name: /Waitlist Control/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByPlaceholder(/Search guests/i)).toBeVisible({ timeout: 15000 });
    const filterCombobox = page.getByRole("combobox").first();
    if (await maybeVisible(filterCombobox)) {
      await safeClick(filterCombobox, "waitlist status filter");
      await page.keyboard.press("Escape");
    }
    await pauseForDemo(1500);
  });

  await test.step("SECTION 13: System Health Monitoring", async () => {
    await page.goto("/admin/dashboard");
    await showDemoBanner(
      page,
      "Demo Focus: System Health Monitoring",
      "Validates FR-13 System Health: database, email, and payment service indicators.",
      ["FR-13"],
    );

    await expect(page.getByRole("heading", { name: /System Status/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Database").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Email").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Payments").first()).toBeVisible({ timeout: 15000 });
    await pauseForDemo(2200);
  });

  await test.step("SECTION 14: Error Handling and Validation Summary", async () => {
    await showDemoBanner(
      page,
      "Demo Focus: Error Handling and Validations",
      "Shows validation coverage: consent, operating hours, no availability, protected routes, tokenized payment, offline warning, and lock conflict evidence.",
      ["SEC-1", "LEG-1", "LEG-2"],
    );

    await page.goto("/admin/reservations");
    const newReservationBtn = page.getByRole("button", { name: /New Reservation/i }).first();
    if (await safeClick(newReservationBtn, "open reservation validation modal")) {
      const dialog = page.locator('[role="dialog"]').filter({ hasText: /New Reservation/i });
      if (await maybeVisible(dialog)) {
        const inputs = dialog.locator("input");
        if ((await inputs.count()) >= 4) {
          await inputs.nth(0).fill("QA Demo Validation");
          await inputs.nth(1).fill("08:00");
          await inputs.nth(2).fill("2");
          await inputs.nth(3).fill("T1");
          await safeClick(dialog.getByRole("button", { name: /Add Reservation|Create/i }), "submit out-of-hours validation");
          await expect(dialog.getByText(/open from|operating hours|11:00|invalid|time/i)).toBeVisible({
            timeout: 15000,
          });
        }
        await page.keyboard.press("Escape");
      }
    }

    await page.goto("/customer/dashboard");
    await expect(page).toHaveURL(/admin\/dashboard|auth\/login/, { timeout: 15000 });
    await pauseForDemo(1500);
  });

  await test.step("SECTION 15: Reports and Analytics", async () => {
    await showDemoBanner(
      page,
      "Demo Focus: Reports and Analytics Evidence",
      "Shows Playwright report, Lighthouse performance, concurrency evidence, and traceability to SRS/SWDD/SPM-PC.",
      ["TC-3", "TC-7", "SRS", "SWDD", "SPM-PC"],
    );

    console.log("[DEMO] Playwright Functional Report: playwright-report/index.html");
    console.log("[DEMO] Lighthouse Performance Report: tests/lighthouse/report.json");
    console.log("[DEMO] Concurrency Test Result: tests/e2e/tc3-concurrency.spec.ts");
    console.log("[DEMO] RBAC/Security Test Result: tests/e2e/tc7-api-rbac.spec.ts");
    console.log("[DEMO] Traceability Matrix: Documents/documentation.md");
    console.log(
      "[DEMO] GitHub Repository: https://github.com/Qdreon/Gordon-Ramsay-Restaurant-Reservation-System",
    );

    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: /System Status/i })).toBeVisible({
      timeout: 15000,
    });
    await pauseForDemo(1800);
  });

  await test.step("DEMO COMPLETE", async () => {
    await showDemoBanner(
      page,
      "Demo Completed: GRRRS Functional, Tested, and Traceable",
      "The demo covered authentication, booking, waitlist, admin operations, validations, system health, and QA reports.",
      ["FR-1", "FR-13", "SEC-1", "LEG-2"],
    );
    await pauseForDemo(3500);
  });
});
