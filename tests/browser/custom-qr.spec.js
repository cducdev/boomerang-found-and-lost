import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

test('custom label persists, exported PNG decodes to the original link, and invalid colors are blocked', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.request.post('/api/auth/register', {
    data: {
      name: 'Custom QR',
      email: `custom-${Date.now()}@example.com`,
      password: 'CustomQrTest1234',
    },
  });
  await page.request.post('/api/items', { data: { name: 'Balo tùy chỉnh', category: 'Balo' } });
  await page.reload();
  await page.getByRole('button', { name: 'Xem QR', exact: true }).click();
  const preview = page.getByAltText('Mã QR cho Balo tùy chỉnh');
  await expect(preview).toBeVisible();
  const originalUrl = await page.getByTestId('qr-link').inputValue();
  await page.getByRole('button', { name: 'Mẫu Tím', exact: true }).click();
  await page.getByLabel('Màu nền nhãn', { exact: true }).fill('#fff4e8');
  await page
    .getByLabel('Lời nhắn trên nhãn')
    .fill('  Nhặt được balo? Gửi mình một lời nhắn nhé!  ');
  await page.getByLabel('Hiện logo Boomerang').uncheck();
  await page.getByRole('button', { name: 'Lưu thiết kế', exact: true }).click();
  await expect(page.getByText('Đã lưu thiết kế', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Lời nhắn trên nhãn')).toHaveValue(
    'Nhặt được balo? Gửi mình một lời nhắn nhé!',
  );
  await expect(page.getByRole('button', { name: 'Lưu thiết kế', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Xem QR', exact: true }).click();
  await expect(page.getByLabel('Màu mã QR', { exact: true })).toHaveValue('#2110b4');
  await expect(page.getByLabel('Màu nền nhãn', { exact: true })).toHaveValue('#fff4e8');
  await expect(page.getByLabel('Hiện logo Boomerang')).not.toBeChecked();
  await expect(page.getByLabel('Lời nhắn trên nhãn')).toHaveValue(
    'Nhặt được balo? Gửi mình một lời nhắn nhé!',
  );
  await expect(page.getByRole('button', { name: 'Tải nhãn PNG' })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải nhãn PNG' }).click();
  const download = await downloadPromise;
  const png = PNG.sync.read(await readFile(await download.path()));
  expect([png.width, png.height]).toEqual([720, 880]);
  expect([...png.data.subarray(0, 4)]).toEqual([255, 244, 232, 255]);
  expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(originalUrl);
  await page.getByLabel('Màu mã QR', { exact: true }).fill('#ffffff');
  await expect(page.getByText(/Màu mã cần tối hơn nền/)).toBeVisible();
  for (const name of ['Lưu thiết kế', 'Tải nhãn PNG', 'In nhãn'])
    await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  await expect(page.getByTestId('qr-link')).toHaveValue(originalUrl);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
