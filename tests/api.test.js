import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('owner QR flow, access isolation, persistent messages and validation', async () => {
  const { app, db } = createApp({ databasePath: ':memory:' });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, { cookie, method = 'GET', body } = {}) => {
    const response = await fetch(base + '/api' + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  };
  try {
    assert.equal((await request('/items')).status, 401);
    const account = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Minh', email: 'minh@example.com', password: 'password1234' },
    });
    assert.equal(account.status, 201);
    const cookie = account.cookie;
    assert.ok(cookie);
    assert.equal(
      (
        await request('/auth/register', {
          method: 'POST',
          body: { name: 'Minh', email: 'minh@example.com', password: 'password1234' },
        })
      ).status,
      409,
    );
    const created = await request('/items', {
      method: 'POST',
      cookie,
      body: {
        name: 'Balo đi học',
        category: 'Balo',
        description: 'Màu xanh',
        phone: '0901234567',
        publicPhone: false,
      },
    });
    assert.equal(created.status, 201);
    const item = created.body;
    assert.equal(item.qrDesign.foreground, '#0a3566');
    const publicItem = await request('/public/' + item.token);
    assert.equal(publicItem.body.ownerName, 'Minh');
    assert.equal(publicItem.body.phone, undefined);
    assert.equal(publicItem.body.email, undefined);
    assert.equal(publicItem.body.user_id, undefined);
    assert.equal(
      (await request('/public/' + item.token + '/scan', { method: 'POST', body: {} })).status,
      201,
    );
    const sent = await request('/public/' + item.token + '/messages', {
      method: 'POST',
      body: { message: 'Mình thấy ở thư viện', location: 'Tầng 2', contact: '0901111111' },
    });
    assert.equal(sent.status, 201);
    const events = await request('/events', { cookie });
    assert.equal(events.body.length, 2);
    assert.equal(events.body[0].message, 'Mình thấy ở thư viện');
    const other = await request('/auth/register', {
      method: 'POST',
      body: { name: 'An', email: 'an@example.com', password: 'password1234' },
    });
    assert.equal(
      (
        await request(`/items/${item.id}`, {
          cookie: other.cookie,
          method: 'PATCH',
          body: { status: 'lost' },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(`/items/${item.id}`, {
          cookie: other.cookie,
          method: 'PATCH',
          body: {
            qrDesign: {
              foreground: '#2110b4',
              background: '#ffffff',
              message: 'Nhặt được đồ?',
              showBrand: false,
            },
          },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(`/items/${item.id}`, {
          cookie,
          method: 'PATCH',
          body: {
            qrDesign: {
              foreground: '#eeeeee',
              background: '#ffffff',
              message: 'Nhặt được đồ?',
              showBrand: true,
            },
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(`/items/${item.id}`, {
          cookie,
          method: 'PATCH',
          body: {
            qrDesign: {
              foreground: '#2110b4',
              background: '#ffffff',
              message: 'Nhặt được đồ?',
              showBrand: true,
              url: 'https://evil.example',
            },
          },
        })
      ).status,
      400,
    );
    assert.deepEqual((await request('/events', { cookie: other.cookie })).body, []);
    assert.equal(
      (await request(`/items/${item.id}`, { cookie, method: 'PATCH', body: { status: 'lost' } }))
        .body.status,
      'lost',
    );
    await request(`/items/${item.id}`, { cookie, method: 'PATCH', body: { publicPhone: true } });
    assert.equal((await request('/public/' + item.token)).body.phone, '0901234567');
    assert.equal(
      (
        await request('/public/' + item.token + '/messages', {
          method: 'POST',
          body: { message: '' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/public/' + item.token + '/messages', {
          method: 'POST',
          body: { message: 'Nhặt được', latitude: 999, longitude: 0 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/auth/login', {
          method: 'POST',
          body: { email: 'minh@example.com', password: 'badpassword' },
        })
      ).status,
      401,
    );
    const csrf = await fetch(base + '/api/items', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ name: 'nope' }),
    });
    assert.equal(csrf.status, 403);
    assert.equal((await request('/auth/logout', { cookie, method: 'POST', body: {} })).status, 200);
    assert.equal((await request('/items', { cookie })).status, 401);
    const login = await request('/auth/login', {
      method: 'POST',
      body: { email: 'minh@example.com', password: 'password1234' },
    });
    assert.equal((await request('/items', { cookie: login.cookie })).body.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test('data and owner session survive a server restart; deleting a tag revokes its public URL', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'unitag-test-'));
  const databasePath = join(directory, 'store.sqlite');
  let instance = createApp({ databasePath });
  let server = instance.app.listen(0);
  const request = async (path, cookie, method = 'GET', data) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  };
  try {
    const account = await request('/auth/register', null, 'POST', {
      name: 'An',
      email: 'an@example.com',
      password: 'password1234',
    });
    const item = (await request('/items', account.cookie, 'POST', { name: 'Ví cá nhân' })).data;
    const design = {
      foreground: '#2110b4',
      background: '#f1f4fd',
      message: 'Nhặt được ví? Gửi mình lời nhắn nhé!',
      showBrand: false,
    };
    const saved = await request('/items/' + item.id, account.cookie, 'PATCH', { qrDesign: design });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.data.qrDesign, design);
    assert.equal(saved.data.token, item.token);
    await new Promise((resolve) => server.close(resolve));
    instance.db.close();
    instance = createApp({ databasePath });
    server = instance.app.listen(0);
    assert.equal((await request('/items', account.cookie)).data[0].name, 'Ví cá nhân');
    assert.deepEqual((await request('/items', account.cookie)).data[0].qrDesign, design);
    assert.equal((await request('/items/' + item.id, account.cookie, 'DELETE')).status, 200);
    assert.equal((await request('/public/' + item.token)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    instance.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
