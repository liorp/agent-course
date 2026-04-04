import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('English landing page', async ({ page }) => {
    await page.goto('/en/');
    await expect(page).toHaveScreenshot('landing-en.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Hebrew landing page (RTL)', async ({ page }) => {
    await page.goto('/he/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(page).toHaveScreenshot('landing-he.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('English session page', async ({ page }) => {
    await page.goto('/en/s01-the-agent-loop');
    await expect(page).toHaveScreenshot('session-en-s01.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Hebrew session page (RTL)', async ({ page }) => {
    await page.goto('/he/s01-the-agent-loop');
    await expect(page).toHaveScreenshot('session-he-s01.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Code blocks are LTR in Hebrew pages', async ({ page }) => {
    await page.goto('/he/s01-the-agent-loop');
    const codeBlock = page.locator('pre').first();
    const direction = await codeBlock.evaluate(el => getComputedStyle(el).direction);
    expect(direction).toBe('ltr');
  });

  test('Header is sticky', async ({ page }) => {
    await page.goto('/en/s01-the-agent-loop');
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(300);
    const header = page.locator('.site-header');
    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    expect(box?.y).toBe(0);
  });

  test('Session navigation links work', async ({ page }) => {
    await page.goto('/en/s01-the-agent-loop');
    const nextLink = page.locator('.nav-next');
    await expect(nextLink).toBeVisible();
    await nextLink.click();
    await expect(page).toHaveURL(/s02-tool-use/);
  });

  test('Language switcher navigates correctly', async ({ page }) => {
    await page.goto('/en/s01-the-agent-loop');
    const langLink = page.locator('.lang-link');
    await langLink.click();
    await expect(page).toHaveURL(/\/he\/s01-the-agent-loop/);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('Beginner explainer toggles', async ({ page }) => {
    await page.goto('/en/s01-the-agent-loop');
    const details = page.locator('.beginner-explainer');
    const content = page.locator('.explainer-content');
    // Should be collapsed by default
    await expect(details).not.toHaveAttribute('open');
    // Click to open
    await page.locator('.explainer-summary').click();
    await expect(details).toHaveAttribute('open');
    await expect(content).toBeVisible();
  });
});
