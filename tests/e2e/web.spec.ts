import { expect, test } from '@playwright/test';

test('renders the core result in the production build without page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#summary')).toHaveText('3 values · total 12 · average 4');
  await expect(page.locator('#summary')).toHaveAttribute('data-total', '12');
  expect(errors).toEqual([]);
});
