import { test, expect, Page } from '@playwright/test';

/** Jumps a figure's player to its last frame. */
async function toEnd(page: Page, figure: string) {
  await page.locator(`${figure} app-player .scrub`).focus();
  await page.keyboard.press('End');
}

test.describe('How it works', () => {
  test.beforeEach(async ({ page }) => {
    // The calendar page calls the real holiday API; the explainer uses its own simulated one.
    await page.route('**/api/v3/PublicHolidays/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
  });

  test('opens from the header and plays the four figures', async ({ page }) => {
    await page.goto('/');
    await page.click('.how-link');

    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page).toHaveTitle('How it works · Rate Calendar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.hiw-chapter')).toHaveCount(4);
    await expect(page.locator('app-hero-map .map-node')).toHaveCount(8);

    // 1. Pricing: all three rules apply on July 4th.
    const pricing = page.locator('#pricing');
    await pricing.locator('.hiw-chip', { hasText: 'Jul 4' }).click();
    await toEnd(page, '#pricing');
    await expect(pricing.locator('app-player .text')).toHaveText('Stamp $225 onto Sat, Jul 4');
    await expect(pricing.locator('.gate[data-state="open"]')).toHaveCount(3);

    // 2. Signals: switching country re-runs the holiday side only.
    const signals = page.locator('#signals');
    await expect(signals.locator('.result')).toContainText('31 of 31 days changed');
    await signals.locator('.seg button', { hasText: 'TW' }).click();
    await expect(signals.locator('.result')).toContainText('1 of 31 days changed');
    await toEnd(page, '#signals');
    await expect(signals.locator('[data-node="holidayMap"]')).toHaveClass(/lit/);
    await expect(signals.locator('[data-node="rules"]')).not.toHaveClass(/lit/);

    // 3. Network: in the race the late US answer is blocked and TW stays.
    const network = page.locator('#network');
    await network.locator('[data-scenario="race"]').click();
    await toEnd(page, '#network');
    await expect(network.locator('.card .shown b')).toHaveText('TW 2026 · 8');
    await expect(network.locator('.card .country b')).toHaveText('TW');

    // 4. Agent concept: ends with the approved config.
    await toEnd(page, '#agent');
    await expect(page.locator('#agent svg.hiw-svg')).toContainText('v14');
  });

  test('switches to Chinese and back, and supports deep links', async ({ page }) => {
    await page.goto('/how-it-works/zh');

    await expect(page).toHaveTitle('它是怎麼運作的 · Rate Calendar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(page.locator('.hiw-title')).toHaveText('拆開一個房價日曆');
    await expect(page.locator('#agent .hiw-concept')).toContainText('構想 · 尚未實作');

    await page.click('.hiw-langs >> text=EN');
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.locator('.hiw-title')).toHaveText('Taking a rate calendar apart');

    await page.click('.hiw-index a >> nth=2');
    await expect(page).toHaveURL(/\/how-it-works#network$/);
    await expect(page.locator('#network')).toBeInViewport();
  });

  test('fits a phone screen without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/how-it-works');
    await expect(page.locator('app-hero-map svg')).toHaveAttribute('viewBox', '0 0 340 380');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
