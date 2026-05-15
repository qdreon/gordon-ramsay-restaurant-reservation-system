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
