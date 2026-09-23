import { test, expect, Page } from '@playwright/test';

const MOCK_HOLIDAYS_2026 = [
  {
    date: '2026-01-01',
    localName: "New Year's Day",
    name: "New Year's Day",
    countryCode: 'US',
    fixed: true,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public'],
  },
  {
    date: '2026-01-19',
    localName: 'Martin Luther King, Jr. Day',
    name: 'Martin Luther King, Jr. Day',
    countryCode: 'US',
    fixed: false,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public'],
  },
  {
    date: '2026-07-04',
    localName: 'Independence Day',
    name: 'Independence Day',
    countryCode: 'US',
    fixed: true,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public'],
  },
  {
    date: '2026-12-25',
    localName: 'Christmas Day',
    name: 'Christmas Day',
    countryCode: 'US',
    fixed: true,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public'],
  },
];

async function mockHolidayAPI(page: Page) {
  await page.route('**/api/v3/PublicHolidays/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_HOLIDAYS_2026),
    });
  });
}

test.describe('Rate Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await mockHolidayAPI(page);
    await page.goto('/');
  });

  test('should render a full month of calendar days', async ({ page }) => {
    const header = page.locator('.calendar-header h2');
    await expect(header).toBeVisible();

    const dayCells = page.locator('.day-cell');
    await expect(dayCells).toHaveCount(42);

    const weekdayHeaders = page.locator('.weekday-header');
    await expect(weekdayHeaders).toHaveCount(7);
  });

  test('should update prices when config form is changed', async ({ page }) => {
    const firstInMonthCell = page.locator('.day-cell:not(.out-of-month)').first();
    const initialPrice = await firstInMonthCell.locator('.day-price').textContent();

    await page.fill('#baseRate', '200');
    await page.click('.submit-btn');

    await expect(async () => {
      const newPrice = await firstInMonthCell.locator('.day-price').textContent();
      expect(newPrice).not.toBe(initialPrice);
    }).toPass({ timeout: 5000 });
  });

  test('should navigate to the next month and back', async ({ page }) => {
    const header = page.locator('.calendar-header h2');
    await expect(header).not.toBeEmpty();
    const initialMonth = (await header.textContent())!;

    await page.click('.nav-btn >> text=→');
    await expect(header).not.toHaveText(initialMonth);

    await page.click('.nav-btn >> text=←');
    await expect(header).toHaveText(initialMonth);
  });

  test('should show price breakdown when clicking a day', async ({ page }) => {
    const priceDetail = page.locator('.price-detail');
    await expect(priceDetail).not.toBeVisible();

    const dayCell = page.locator('.day-cell.weekend:not(.out-of-month)').first();
    await dayCell.click();

    await expect(priceDetail).toBeVisible();
    await expect(priceDetail.locator('.breakdown-row').first()).toContainText('Base Rate');
    await expect(
      priceDetail.locator('.breakdown-row.adjustment', { hasText: 'Weekend rate' }),
    ).toHaveCount(1);
    await expect(priceDetail.locator('.total')).toContainText('Final Rate');

    await dayCell.click();
    await expect(priceDetail).not.toBeVisible();
  });

  test('should show an error and keep base prices when the holiday API fails', async ({ page }) => {
    await page.route('**/api/v3/PublicHolidays/**', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );
    await page.reload();

    await expect(page.locator('.error-bar')).toContainText('HTTP 500');
    await expect(page.locator('.day-cell')).toHaveCount(42);
    await expect(page.locator('.day-cell.holiday')).toHaveCount(0);
  });
});
