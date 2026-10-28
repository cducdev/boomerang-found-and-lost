import { test, expect } from '@playwright/test';

test('create item, download QR, anonymous finder message and owner receives it', async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Để đồ thất lạc/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo QR đầu tiên' }).click();
  await page.getByLabel('Tên của bạn').fill('Minh Test');
  await page.getByLabel('Email', { exact: true }).fill(`minh.${Date.now()}@example.com`);
  await page.getByLabel('Mật khẩu').fill('testpass12345');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đồ vật của tôi' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm đồ vật', exact: true }).first().click();
  await page.getByLabel('Tên đồ vật').fill('Balo đi học');
  await page.getByRole('textbox', { name: 'Số điện thoại · tùy chọn' }).fill('0901234567');
  await page.getByRole('button', { name: 'Tạo nhãn QR', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nhãn QR của bạn' })).toBeVisible();
  await expect(page.getByAltText('Mã QR cho Balo đi học')).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải nhãn PNG' }).click();
  expect((await downloadEvent).suggestedFilename()).toContain('.png');
  const link = await page.getByTestId('qr-link').inputValue();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  const finderContext = await browser.newContext();
  const finder = await finderContext.newPage();
  await finder.goto(link);
  await expect(finder.getByRole('heading', { name: /Bạn tìm thấy/ })).toBeVisible();
  await expect(finder.getByText('0901234567')).toHaveCount(0);
  await finder.getByLabel('Lời nhắn cho chủ đồ').fill('Mình nhặt được balo ở thư viện nhé!');
  await finder.getByLabel('Bạn nhặt được ở đâu?').fill('Thư viện UIT');
  await finder.getByLabel('Cách liên hệ với bạn').fill('0909999999');
  await finder.getByRole('button', { name: 'Gửi tin cho chủ đồ' }).click();
  await expect(finder.getByRole('heading', { name: 'Lời nhắn đã được gửi!' })).toBeVisible();
  await page
    .getByRole('button', { name: /Thông báo/ })
    .first()
    .click();
  await expect(page.getByText('Mình nhặt được balo ở thư viện nhé!')).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Đồ vật của tôi', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi trạng thái Balo đi học' }).click();
  await page.getByRole('button', { name: 'Báo thất lạc', exact: true }).click();
  await expect(page.getByText('Thất lạc', { exact: true }).last()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Balo đi học' })).toBeVisible();
  expect(errors).toEqual([]);
  await finderContext.close();
});

test('mobile landing, invalid QR, and keyboard dialog close', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Để đồ thất lạc/ })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Tạo QR đầu tiên' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/q/not-a-valid-tag');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy nhãn này' })).toBeVisible();
});
