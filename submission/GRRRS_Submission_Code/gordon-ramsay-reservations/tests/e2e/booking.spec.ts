import { test, expect } from "@playwright/test";

const SEARCH_DATE = "2030-01-15";
const SEARCH_TIME = "19:00";
const SEARCH_PARTY_SIZE = "2";
const ASSERT_TIMEOUT = 15_000;

test.describe("Booking flows", () => {
  test("TC-2.1 Search availability and open CheckoutModal when options exist", async ({
    page,
  }) => {
    await page.goto("/");

    const dateInput = page.locator('input[type="date"]');
    const timeInput = page.locator('input[type="time"]');
    const partyInput = page.locator('input[type="number"]');

    await expect(dateInput).toBeVisible({ timeout: ASSERT_TIMEOUT });
    await dateInput.fill(SEARCH_DATE);
    await timeInput.fill(SEARCH_TIME);
    await partyInput.fill(SEARCH_PARTY_SIZE);

    await expect(dateInput).toHaveValue(SEARCH_DATE, {
      timeout: ASSERT_TIMEOUT,
    });
    await expect(timeInput).toHaveValue(SEARCH_TIME, {
      timeout: ASSERT_TIMEOUT,
    });
    await expect(partyInput).toHaveValue(SEARCH_PARTY_SIZE, {
      timeout: ASSERT_TIMEOUT,
    });

    await page.click('button:has-text("Search Availability")');

    await expect(
      page.locator('button:has-text("Search Availability")'),
    ).toBeEnabled({ timeout: ASSERT_TIMEOUT });
    await expect(
      page.locator('h2:has-text("Availability Results")'),
    ).toBeVisible({
      timeout: ASSERT_TIMEOUT,
    });

    const tableOptions = page.locator("ul li button");
    const noAvailabilityMessage = page.locator(
      'p:has-text("No available options found.")',
    );
    const waitlistButton = page.locator(
      'button:has-text("Join Virtual Waitlist"), button:has-text("Waitlist Full"), button:has-text("Checking capacity")',
    );

    const optionCount = await tableOptions.count();

    if (optionCount === 0) {
      const noAvailabilityVisible = await noAvailabilityMessage
        .isVisible({ timeout: ASSERT_TIMEOUT })
        .catch(() => false);
      const waitlistVisible = await waitlistButton
        .first()
        .isVisible({ timeout: ASSERT_TIMEOUT })
        .catch(() => false);

      expect(
        noAvailabilityVisible || waitlistVisible,
        "Search must settle to either table options or the no-availability/waitlist state",
      ).toBe(true);

      test.skip(
        true,
        `No available table options for ${SEARCH_DATE} ${SEARCH_TIME}; checkout modal cannot be opened in this data state.`,
      );
      return;
    }

    await tableOptions.first().click();

    await expect(
      page.locator('h2:has-text("Confirm Your Booking")'),
    ).toBeVisible({
      timeout: ASSERT_TIMEOUT,
    });
    await expect(page.locator("#card")).toBeVisible({
      timeout: ASSERT_TIMEOUT,
    });
    await expect(page.locator("#expiry")).toBeVisible({
      timeout: ASSERT_TIMEOUT,
    });
    await expect(page.locator("#cvv")).toBeVisible({ timeout: ASSERT_TIMEOUT });
  });
});
