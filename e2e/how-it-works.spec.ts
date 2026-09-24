import { test, expect } from '@playwright/test';

test.describe('How it works', () => {
  test.beforeEach(async ({ page }) => {
    // The calendar page calls the real holiday API; the explainer uses its own simulated one.
    await page.route('**/api/v3/PublicHolidays/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
  });

  test('opens from the header and runs the three diagrams', async ({ page }) => {
    await page.goto('/');
    await page.click('.how-link');

    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page).toHaveTitle('How it works · Rate Calendar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.hiw-chapter')).toHaveCount(3);

    // 1. Pricing: Christmas skips the weekend rule and ends at $180.
    const pricing = page.locator('#pricing');
    await pricing.locator('.preset', { hasText: 'Dec 25' }).click();
    await expect(pricing.locator('.step.rule.applied')).toHaveCount(2);
    await expect(pricing.locator('.step.final')).toContainText('$180.00');

    // 2. Signals: switching country re-runs the holiday side only.
    const signals = page.locator('#signals');
    await expect(signals.locator('.cell.holiday')).toHaveCount(1); // US Christmas has loaded
    await signals.locator('button.country', { hasText: 'TW' }).click();
    await expect(signals.locator('.report')).toContainText('1 of 31 days changed');
    await expect(signals.locator('[data-node="rules"]')).not.toHaveClass(/lit/);
    await expect(signals.locator('[data-node="holidayMap"]')).toHaveClass(/lit/);

    // 3. Network: in the race the late US answer is ignored.
    const network = page.locator('#network');
    await network.locator('[data-scenario="race"]').click();
    await expect(network.locator('.tone-warn')).toContainText('stale', { timeout: 5000 });
    await expect(network.locator('.showing')).toContainText('TW');
  });

  test('switches to Chinese and back, and supports deep links', async ({ page }) => {
    await page.goto('/how-it-works/zh');

    await expect(page).toHaveTitle('它是怎麼運作的 · Rate Calendar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(page.locator('.hiw-title')).toHaveText('拆開一個房價日曆');

    await page.click('.hiw-langs >> text=English');
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.locator('.hiw-title')).toHaveText('Taking a rate calendar apart');

    await page.click('.hiw-toc a >> nth=2');
    await expect(page).toHaveURL(/\/how-it-works#network$/);
    await expect(page.locator('#network')).toBeInViewport();
  });
});
