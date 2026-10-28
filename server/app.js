import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import {
  DEFAULT_QR_DESIGN,
  QR_COLOR_PATTERN,
  getQrDesignError,
  normalizeQrDesign,
} from '../shared/qr-design.js';

const scrypt = promisify(scryptCallback);
const id = () => randomBytes(18).toString('base64url');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const text = (max) => z.string().trim().max(max);
const qrDesignInput = z
  .object({
    foreground: z.string().regex(QR_COLOR_PATTERN),
    background: z.string().regex(QR_COLOR_PATTERN),
    message: text(80).min(1),
    showBrand: z.boolean(),
  })
  .strict()
  .refine((design) => !getQrDesignError(design), 'Màu QR chưa đủ tương phản.');
const serializeItem = (item) => ({ ...item, qrDesign: normalizeQrDesign(item.qrDesign) });
const phone = text(24).regex(/^[+\d\s().-]*$/, 'Số điện thoại không hợp lệ.');
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
});
const itemInput = z.object({
  name: text(80).min(1),
  category: z.enum(['Balo', 'Chìa khóa', 'Ví', 'Thiết bị', 'Khác']).default('Khác'),
  description: text(400).default(''),
  phone: phone.default(''),
  publicPhone: z.boolean().default(false),
});
const messageInput = z
  .object({
    message: text(1000).min(3),
    location: text(200).default(''),
    contact: text(120).default(''),
    finderName: text(80).default(''),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine(
    (v) => (v.latitude === undefined) === (v.longitude === undefined),
    'Vị trí không hợp lệ.',
  );
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
};

export function createApp({ databasePath = 'data/unitag.sqlite' } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, phone TEXT NOT NULL, publicPhone INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'safe', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE, kind TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '', finderName TEXT NOT NULL DEFAULT '', latitude REAL, longitude REAL, isRead INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS items_owner ON items(user_id);
    CREATE INDEX IF NOT EXISTS events_item ON events(item_id);`);
  // Additive migration preserves existing items, QR URLs and user accounts.
  if (
    !db
      .prepare('PRAGMA table_info(items)')
      .all()
      .some((column) => column.name === 'qrDesign')
  ) {
    db.exec("ALTER TABLE items ADD COLUMN qrDesign TEXT NOT NULL DEFAULT '{}'");
  }
  const app = express();
  app.disable('x-powered-by');
  // Vite uses inline development scripts. Production retains Helmet's default CSP.
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? { directives: { 'img-src': ["'self'", 'data:', 'blob:'] } }
          : false,
      strictTransportSecurity: process.env.COOKIE_SECURE === 'true',
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      const expected = new Set([`http://${req.headers.host}`, `https://${req.headers.host}`]);
      if (process.env.PUBLIC_URL) expected.add(new URL(process.env.PUBLIC_URL).origin);
      if (!expected.has(req.headers.origin))
        return res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
    }
    next();
  });
  const limiter = (max) =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' },
    });
  app.use('/api', limiter(600));
  app.use('/api/auth/register', limiter(10));
  app.use('/api/auth/login', limiter(20));

  const sessionUser = (req) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('unitag_session='))
      ?.slice(15);
    if (!token) return undefined;
    return db
      .prepare(
        'SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ? AND expires > ?',
      )
      .get(hash(token), Date.now());
  };
  const requireUser = (req, res, next) => {
    req.user = sessionUser(req);
    if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập.' });
    next();
  };
  const startSession = (res, user) => {
    const token = id();
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(
      hash(token),
      user.id,
      Date.now() + 7 * 86400000,
    );
    res.cookie('unitag_session', token, { ...cookieOptions, maxAge: 7 * 86400000 });
  };
  app.get('/api/auth/me', (req, res) => res.json({ user: sessionUser(req) ?? null }));
  app.post('/api/auth/register', async (req, res) => {
    const input = credentials.extend({ name: text(80).min(1) }).parse(req.body);
    const salt = randomBytes(16).toString('hex');
    const digest = (await scrypt(input.password, salt, 64)).toString('hex');
    const user = { id: id(), name: input.name, email: input.email };
    try {
      db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(
        user.id,
        user.name,
        user.email,
        `${salt}:${digest}`,
      );
    } catch (error) {
      if (error.errcode === 2067 || error.code?.includes('SQLITE_CONSTRAINT'))
        return res.status(409).json({ error: 'Email này đã được sử dụng.' });
      throw error;
    }
    startSession(res, user);
    res.status(201).json(user);
  });
  app.post('/api/auth/login', async (req, res) => {
    const input = credentials.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email);
    const [salt, digest] = (user?.password ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
    const candidate = await scrypt(input.password, salt, 64);
    if (!user || !timingSafeEqual(candidate, Buffer.from(digest, 'hex')))
      return res.status(401).json({ error: 'Email hoặc mật khẩu chưa đúng.' });
    startSession(res, user);
    res.json({ id: user.id, name: user.name, email: user.email });
  });
  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('unitag_session='))
      ?.slice(15);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token));
    res.clearCookie('unitag_session', cookieOptions);
    res.json({ ok: true });
  });
  app.get('/api/config', (_req, res) => res.json({ publicUrl: process.env.PUBLIC_URL || null }));
  app.get('/api/items', requireUser, (req, res) =>
    res.json(
      db
        .prepare(
          `SELECT items.*, (SELECT COUNT(*) FROM events WHERE item_id = items.id AND kind = 'scan') AS scans FROM items WHERE user_id = ? ORDER BY createdAt DESC`,
        )
        .all(req.user.id)
        .map(serializeItem),
    ),
  );
  app.post('/api/items', requireUser, (req, res) => {
    const input = itemInput.parse(req.body);
    const item = {
      ...input,
      id: id(),
      token: id(),
      status: 'safe',
      createdAt: new Date().toISOString(),
      qrDesign: { ...DEFAULT_QR_DESIGN },
    };
    db.prepare(
      'INSERT INTO items (id, user_id, token, name, category, description, phone, publicPhone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      item.id,
      req.user.id,
      item.token,
      item.name,
      item.category,
      item.description,
      item.phone,
      Number(item.publicPhone),
      item.createdAt,
    );
    res.status(201).json(item);
  });
  app.patch('/api/items/:id', requireUser, (req, res) => {
    const item = db
      .prepare('SELECT * FROM items WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy đồ vật.' });
    const input = z
      .object({
        status: z.enum(['safe', 'lost', 'returned']).optional(),
        publicPhone: z.boolean().optional(),
        qrDesign: qrDesignInput.optional(),
      })
      .parse(req.body);
    db.prepare('UPDATE items SET status = ?, publicPhone = ?, qrDesign = ? WHERE id = ?').run(
      input.status ?? item.status,
      Number(input.publicPhone ?? Boolean(item.publicPhone)),
      JSON.stringify(input.qrDesign ?? normalizeQrDesign(item.qrDesign)),
      item.id,
    );
    res.json(serializeItem(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id)));
  });
  app.delete('/api/items/:id', requireUser, (req, res) => {
    const result = db
      .prepare('DELETE FROM items WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);
    if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy đồ vật.' });
    res.json({ ok: true });
  });
  app.get('/api/events', requireUser, (req, res) =>
    res.json(
      db
        .prepare(
          'SELECT events.*, items.name AS itemName FROM events JOIN items ON items.id = events.item_id WHERE items.user_id = ? ORDER BY events.id DESC LIMIT 100',
        )
        .all(req.user.id),
    ),
  );
  app.post('/api/events/read', requireUser, (req, res) => {
    db.prepare(
      'UPDATE events SET isRead = 1 WHERE item_id IN (SELECT id FROM items WHERE user_id = ?)',
    ).run(req.user.id);
    res.json({ ok: true });
  });
  const publicItem = (req, res, next) => {
    req.item = db
      .prepare(
        'SELECT items.*, users.name AS ownerName FROM items JOIN users ON users.id = items.user_id WHERE items.token = ?',
      )
      .get(req.params.token);
    if (!req.item)
      return res.status(404).json({ error: 'Mã QR không tồn tại hoặc đã được chủ đồ thu hồi.' });
    next();
  };
  app.get('/api/public/:token', publicItem, (req, res) => {
    const { name, category, description, status, ownerName, phone, publicPhone } = req.item;
    res.json({
      name,
      category,
      description,
      status,
      ownerName,
      ...(publicPhone && phone ? { phone } : {}),
    });
  });
  app.post('/api/public/:token/scan', limiter(60), publicItem, (req, res) => {
    db.prepare("INSERT INTO events (item_id, kind, createdAt) VALUES (?, 'scan', ?)").run(
      req.item.id,
      new Date().toISOString(),
    );
    res.status(201).json({ ok: true });
  });
  app.post('/api/public/:token/messages', limiter(15), publicItem, (req, res) => {
    const input = messageInput.parse(req.body);
    db.prepare(
      "INSERT INTO events (item_id, kind, message, location, contact, finderName, latitude, longitude, createdAt) VALUES (?, 'message', ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      req.item.id,
      input.message,
      input.location,
      input.contact,
      input.finderName,
      input.latitude ?? null,
      input.longitude ?? null,
      new Date().toISOString(),
    );
    res.status(201).json({ ok: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy yêu cầu.' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: 'Thông tin chưa hợp lệ. Kiểm tra lại nội dung và độ dài các trường.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Nội dung quá dài.' });
    if (error instanceof SyntaxError)
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    console.error(error);
    res.status(500).json({ error: 'Có lỗi xảy ra. Vui lòng thử lại.' });
  });
  return { app, db };
}
