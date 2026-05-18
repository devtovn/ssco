import { test, expect } from '@playwright/test';

test('homepage loads with search', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByLabel('Tìm kiếm sản phẩm')).toBeVisible();
});

test('search navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Tìm kiếm sản phẩm').fill('iphone');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page).toHaveURL(/\/search\?q=iphone/);
});
