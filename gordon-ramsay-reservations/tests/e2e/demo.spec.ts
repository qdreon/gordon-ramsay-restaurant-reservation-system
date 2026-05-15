import { test, expect, type Page } from "@playwright/test";

const CUSTOMER_EMAIL = "test-customer@example.com";
const CUSTOMER_PASSWORD = "TestPassword123!";
const ADMIN_EMAIL = "test-admin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

const DEMO_DATE = "2026-12-15";
const VALID_TIME = "19:00";
const INVALID_TIME = "08:00";
const PARTY_SIZE = "2";
const BASE_URL = "http://localhost:3000";
const OPERATING_HOURS_MESSAGE = /Restaurant is only open from 11:00 to 23:00\.?/i;

function markDemoSection(label: string) {
  console.log(`\n[DEMO] ${label}`);
}

async function waitBefore(page: Page, ms = 1000) {
  await page.waitForTimeout(ms);
}

async function step(page: Page, work: () => Promise<unknown>) {
  await waitBefore(page);
  await work();
}

async function setWindowBounds(page: Page, left: number, top: number, width: number, height: number) {
  const client = await page.context().newCDPSession(page);
  const { windowId } = await client.send("Browser.getWindowForTarget");
  await client.send("Browser.setWindowBounds", {
    windowId,
    bounds: {
      left,
      top,
      width,
      height,
      windowState: "normal",
    },
  });
  await client.detach();
}

async function tileWindowsSideBySide(leftPage: Page, rightPage: Page) {
  try {
    const screen = await leftPage.evaluate(() => ({
      width: window.screen.availWidth || 1920,
      height: window.screen.availHeight || 1080,
    }));

    const totalWidth = Math.max(screen.width, 1280);
    const totalHeight = Math.max(screen.height, 720);
    const leftWidth = Math.floor(totalWidth / 2);
    const rightWidth = totalWidth - leftWidth;

    await setWindowBounds(leftPage, 0, 0, leftWidth, totalHeight);
    await setWindowBounds(rightPage, leftWidth, 0, rightWidth, totalHeight);
  } catch {
    // Keep demo flow running if the browser/window manager blocks repositioning.
  }
}

async function signIn(page: Page, route: string, email: string, password: string, url: RegExp) {
  await step(page, async () => {
    await page.goto(route);
  });
  await step(page, async () => {
    await page.fill("#email", email);
  });
  await step(page, async () => {
    await page.fill("#password", password);
  });
  await step(page, async () => {
    await page.click('button[type="submit"]');
  });
  await expect(page).toHaveURL(url, { timeout: 20_000 });
}

test.describe("Headful demo walkthrough", () => {
  test("runs customer and admin flows side by side", async ({ browser }) => {
    test.setTimeout(240_000);

    const customerContext = await browser.newContext({
      baseURL: BASE_URL,
      viewport: null,
    });
    const adminContext = await browser.newContext({
      baseURL: BASE_URL,
      viewport: null,
    });

    const customerPage = await customerContext.newPage();
    const adminPage = await adminContext.newPage();

    customerPage.on("dialog", (dialog) => dialog.accept());

    try {
      await waitBefore(customerPage);
      await tileWindowsSideBySide(customerPage, adminPage);

      markDemoSection("DR-0 Application is accessible and functional");
      await step(customerPage, async () => {
        await customerPage.goto("/");
      });
      await expect(customerPage.locator('button:has-text("Search Availability")')).toBeVisible({
        timeout: 15_000,
      });

      markDemoSection("DR-1 Login and Authentication");

      await signIn(
        customerPage,
        "/auth/login",
        CUSTOMER_EMAIL,
        CUSTOMER_PASSWORD,
        /customer\/dashboard/,
      );

      await signIn(
        adminPage,
        "/admin/login",
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
        /admin\/dashboard/,
      );

      markDemoSection("DR-2 Major system features");

      await step(customerPage, async () => {
        await customerPage.goto("/");
      });
      await step(customerPage, async () => {
        await customerPage.fill('input[type="date"]', DEMO_DATE);
      });
      await step(customerPage, async () => {
        await customerPage.fill('input[type="time"]', VALID_TIME);
      });
      await step(customerPage, async () => {
        await customerPage.fill('input[type="number"]', PARTY_SIZE);
      });
      await step(customerPage, async () => {
        await customerPage.click('button:has-text("Search Availability")');
      });
      await expect(
        customerPage.locator('h2:has-text("Availability Results")'),
      ).toBeVisible({ timeout: 15_000 });

      const tableOptions = customerPage.locator("ul li button");
      const optionCount = await tableOptions.count();

      if (optionCount > 0) {
        await step(customerPage, async () => {
          await tableOptions.first().click();
        });
        await expect(
          customerPage.locator('h2:has-text("Confirm Your Booking")'),
        ).toBeVisible({ timeout: 15_000 });

        await step(customerPage, async () => {
          await customerPage.fill("#card", "4111111111111111");
        });
        await step(customerPage, async () => {
          await customerPage.fill("#expiry", "12/25");
        });
        await step(customerPage, async () => {
          await customerPage.fill("#cvv", "123");
        });
        await step(customerPage, async () => {
          await customerPage.click('button:has-text("Confirm Booking")');
        });

        await expect(customerPage.locator("h2:has-text('My Reservations')")).toBeVisible({
          timeout: 20_000,
        });

        const cancelButtons = customerPage.locator('button:has-text("Cancel")');
        if ((await cancelButtons.count()) > 0) {
          await step(customerPage, async () => {
            await cancelButtons.first().click();
          });
          await expect(customerPage.getByText(/cancelled successfully/i)).toBeVisible({
            timeout: 15_000,
          });
        }
      } else {
        const waitlistButton = customerPage.locator(
          'button:has-text("Join Virtual Waitlist")',
        );
        const waitlistFullButton = customerPage.locator('button:has-text("Waitlist Full")');

        if ((await waitlistButton.count()) > 0) {
          await expect(waitlistButton).toBeVisible({ timeout: 15_000 });

          await step(customerPage, async () => {
            await waitlistButton.click();
          });
          await expect(
            customerPage.locator('h2:has-text("Join the Virtual Waitlist")'),
          ).toBeVisible({ timeout: 15_000 });

          await step(customerPage, async () => {
            await customerPage.click('button:has-text("Join Waitlist")');
          });
        } else if ((await waitlistFullButton.count()) > 0) {
          await expect(waitlistFullButton).toBeVisible({ timeout: 15_000 });
        } else {
          await waitBefore(customerPage);
        }
      }

      await step(adminPage, async () => {
        await adminPage.goto("/admin/floorplan");
      });
      await expect(adminPage.locator('h2:has-text("Interactive Floor Plan")')).toBeVisible({
        timeout: 15_000,
      });
      const tableButtons = adminPage.locator("button").filter({ hasText: /^T\d/ });
      await expect(tableButtons.first()).toBeVisible({ timeout: 15_000 });

      await step(adminPage, async () => {
        await tableButtons.first().click();
      });
      await expect(adminPage.locator("text=Walk-In").first()).toBeVisible({
        timeout: 15_000,
      });

      markDemoSection("DR-3 Input and output processes");

      await step(customerPage, async () => {
        await customerPage.goto("/customer/dashboard");
      });
      await expect(customerPage.locator('h2:has-text("My Reservations")')).toBeVisible({
        timeout: 15_000,
      });

      markDemoSection("DR-4 Reports or analytics (if applicable)");

      await step(adminPage, async () => {
        await adminPage.goto("/admin/dashboard");
      });
      await expect(adminPage.locator('h2:has-text("System Status")')).toBeVisible({
        timeout: 15_000,
      });
      await expect(adminPage.locator('h2:has-text("Live Floor Plan")')).toBeVisible({
        timeout: 15_000,
      });
      await expect(adminPage.locator("text=Database").first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(adminPage.locator("text=Email").first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(adminPage.locator("text=Payments").first()).toBeVisible({
        timeout: 15_000,
      });

      markDemoSection("DR-5 Error handling and validations");

      await step(customerPage, async () => {
        await customerPage.goto("/");
      });
      await step(customerPage, async () => {
        await customerPage.fill('input[type="date"]', DEMO_DATE);
      });
      await step(customerPage, async () => {
        await customerPage.fill('input[type="time"]', INVALID_TIME);
      });
      await step(customerPage, async () => {
        await customerPage.fill('input[type="number"]', PARTY_SIZE);
      });
      await step(customerPage, async () => {
        await customerPage.click('button:has-text("Search Availability")');
      });
      await expect(customerPage.getByText(OPERATING_HOURS_MESSAGE)).toBeVisible({
        timeout: 15_000,
      });

      await step(adminPage, async () => {
        await adminPage.goto("/admin/reservations");
      });
      const newReservationButton = adminPage.locator("button", {
        hasText: /New Reservation/i,
      });
      await expect(newReservationButton.first()).toBeVisible({ timeout: 15_000 });

      await step(adminPage, async () => {
        await newReservationButton.first().click();
      });
      await expect(
        adminPage.locator('[role="dialog"]').filter({ hasText: /New Reservation/ }),
      ).toBeVisible({ timeout: 15_000 });

      const reservationInputs = adminPage.locator('[role="dialog"] input');
      await step(adminPage, async () => {
        await reservationInputs.nth(0).fill("QA Demo Guest");
      });
      await step(adminPage, async () => {
        await reservationInputs.nth(1).fill(INVALID_TIME);
      });
      await step(adminPage, async () => {
        await reservationInputs.nth(2).fill("2");
      });
      await step(adminPage, async () => {
        await reservationInputs.nth(3).fill("T1");
      });
      await step(adminPage, async () => {
        await adminPage.locator('[role="dialog"] button[type="submit"]').click();
      });
      await expect(
        adminPage.locator('[role="dialog"]').getByText(OPERATING_HOURS_MESSAGE),
      ).toBeVisible({ timeout: 15_000 });

      await step(adminPage, async () => {
        await adminPage.keyboard.press("Escape");
      });

      await waitBefore(adminPage, 4_500);
      await waitBefore(customerPage, 4_500);
    } finally {
      await adminContext.close();
      await customerContext.close();
    }
  });
});