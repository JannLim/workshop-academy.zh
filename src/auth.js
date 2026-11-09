// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  HttpError, parseCookies, readJson, redirect, sendHtml, sendJson, serializeCookie,
} from './http.js';
import { loginPage } from './views/login.js';

const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { hash: scryptSync(password, salt, KEY_LENGTH).toString('hex'), salt };
}

// 用户不存在时也计算一次散列，避免靠响应时间猜出账号是否存在。
const dummy = hashPassword('not-a-real-password');

export function verifyPassword(user, password) {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) return false;
  const expected = Buffer.from(user ? user.password_hash : dummy.hash, 'hex');
  const actual = scryptSync(password, user ? user.password_salt : dummy.salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual) && Boolean(user);
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
}

export const SESSION_COOKIE = 'academy_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** 会话令牌只存在浏览器 cookie 中；数据库只保存它的散列。 */
export function createSession(db, userId, now = Date.now()) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, now + SESSION_TTL_MS, now);
  return token;
}

export function sessionToken(req) {
  const token = parseCookies(req.headers.cookie).get(SESSION_COOKIE);
  return token && /^[0-9a-f]{64}$/.test(token) ? token : null;
}

export function findSessionUser(db, token, now = Date.now()) {
  if (!token || !db) return null;
  return db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(hashToken(token), now) ?? null;
}

export function deleteSession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** 接口用：未登录返回 401。 */
export function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, '请先登录');
  return ctx.user;
}

/** 接口用：未登录 401，非管理员 403。 */
export function requireAdmin(ctx) {
  const user = requireUser(ctx);
  if (user.role !== 'admin') throw new HttpError(403, '只有管理员可以执行这个操作');
  return user;
}

/** 页面用：未登录时跳转到登录页并返回 null，非管理员显示 403 页面。 */
export function requireAdminPage(ctx) {
  if (!ctx.user) {
    redirect(ctx.res, `/login?next=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}`);
    return null;
  }
  if (ctx.user.role !== 'admin') throw new HttpError(403, '这个页面只对管理员开放');
  return ctx.user;
}

/** 登录后跳转地址只接受站内相对路径，防止被借去跳到外站。 */
export function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (/[\u0000-\u001f\u007f\\]/.test(value) || value.length > 512) return '/';
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/api/')) return '/';
  return value;
}

/** demoAccounts 只用于登录页的一键登录提示。 */
export function registerAuthRoutes(app, { demoAccounts = [], demoPassword = '' } = {}) {
  const { router } = app;
  app.currentUser = (ctx) => publicUser(findSessionUser(ctx.db, sessionToken(ctx.req)));

  router.post('/api/login', async (ctx) => {
    const input = await readJson(ctx.req);
    const { username, password } = input;
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
      throw new HttpError(400, '请输入用户名和密码', {
        fields: {
          ...(typeof username !== 'string' || !username.trim() ? { username: '请输入用户名' } : {}),
          ...(typeof password !== 'string' || !password ? { password: '请输入密码' } : {}),
        },
      });
    }
    const user = username.length <= 64
      ? ctx.db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim())
      : null;
    if (!verifyPassword(user, password)) throw new HttpError(401, '用户名或密码错误');
    // 换账号登录时新会话替换旧会话。
    deleteSession(ctx.db, sessionToken(ctx.req));
    const token = createSession(ctx.db, user.id);
    sendJson(ctx.res, 200, { user: publicUser(user) }, {
      'Set-Cookie': serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL_MS / 1000 }),
    });
  });

  router.post('/api/logout', (ctx) => {
    deleteSession(ctx.db, sessionToken(ctx.req));
    sendJson(ctx.res, 200, { ok: true }, { 'Set-Cookie': serializeCookie(SESSION_COOKIE, '', { maxAge: 0 }) });
  });

  // ctx.user 已是对外的用户信息。
  router.get('/api/session', (ctx) => {
    sendJson(ctx.res, 200, { user: ctx.user });
  });

  // 已登录时直接回到 next；带 switch=1（来自 403 页的“换个账号登录”）时仍显示登录表单。
  router.get('/login', (ctx) => {
    const next = safeNextPath(ctx.url.searchParams.get('next'));
    const switching = ctx.url.searchParams.get('switch') === '1';
    if (ctx.user && !switching) {
      redirect(ctx.res, next);
      return;
    }
    sendHtml(ctx.res, 200, loginPage({ next, path: ctx.path, user: ctx.user, accounts: demoAccounts, password: demoPassword }));
  });
}
