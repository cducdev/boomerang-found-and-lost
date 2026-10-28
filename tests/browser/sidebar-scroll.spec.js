import { test, expect } from '@playwright/test';

test('sidebar scrolls independently in the reduced viewport caused by browser zoom', async ({
  page,
}) => {
  await page.goto('/');
  await page.request.post('/api/auth/register', {
    data: {
      name: 'Sidebar Test',
      email: `sidebar-scroll-${Date.now()}@example.com`,
      password: 'SidebarTest1234',
    },
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Đồ vật của tôi/ })).toBeVisible();
  const sidebar = page.locator('.sidebar');
  for (const viewport of [
    { width: 800, height: 400 },
    { width: 1024, height: 300 },
  ]) {
    await page.setViewportSize(viewport);
    await sidebar.hover();
    await page.mouse.wheel(0, 1400);
    await expect.poll(() => sidebar.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const box = await sidebar
          .getByRole('button', { name: 'Đăng xuất', exact: true })
          .boundingBox();
        return Boolean(box && box.y >= 0 && box.y + box.height <= viewport.height);
      })
      .toBe(true);
    await page.mouse.wheel(0, 1400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    // Multiple wheel ticks avoid depending on Chromium's reverse-gesture coalescing.
    await expect(async () => {
      await sidebar.hover();
      await page.mouse.wheel(0, -400);
      expect(await sidebar.evaluate((el) => el.scrollTop)).toBe(0);
    }).toPass({ timeout: 5000 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeInViewport();
});
