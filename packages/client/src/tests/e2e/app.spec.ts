import { expect, test } from '@playwright/test';

test.describe('App', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Haber Full/);
  });
});
