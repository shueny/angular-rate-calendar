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

  test('should navigate months and reload holidays', async ({ page }) => {
    const header = page.locator('.calendar-header h2');
    const initialMonth = await header.textContent();

    await page.click('.nav-btn >> text=→');
    const nextMonth = await header.textContent();
    expect(nextMonth).not.toBe(initialMonth);

    await page.click('.nav-btn >> text=←');
    await expect(header).toHaveText(initialMonth!);
  });

  test('should show price breakdown when clicking a day', async ({ page }) => {
    const priceDetail = page.locator('.price-detail');
    await expect(priceDetail).not.toBeVisible();

    const dayCell = page.locator('.day-cell:not(.out-of-month)').first();
    await dayCell.click();

    await expect(priceDetail).toBeVisible();
    await expect(priceDetail.locator('.breakdown-row')).toHaveCount(
      await priceDetail.locator('.breakdown-row').count(),
    );
    await expect(priceDetail.locator('.total')).toContainText('Final Rate');

    await dayCell.click();
    await expect(priceDetail).not.toBeVisible();
  });
});
