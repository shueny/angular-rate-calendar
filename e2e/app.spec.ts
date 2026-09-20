import { test, expect } from '@playwright/test';

test('app should display title', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('angular-rate-calendar');
});
