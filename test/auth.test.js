// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

import test from 'node:test';
import assert from 'node:assert/strict';
import { client, login, startApp } from './helpers.js';
import { safeNextPath } from '../src/auth.js';

test('示例账号登录后取得 HttpOnly 会话，退出后会话失效', async (t) => {
  const app = await startApp(t);
  const c = client(app.url);
  assert.deepEqual(await (await c.get('/api/session')).json(), { user: null });

  const wrong = await c.post('/api/login', { username: 'student', password: 'nope' });
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), { error: '用户名或密码错误' });
  const unknown = await c.post('/api/login', { username: 'nobody', password: '123456' });
  assert.equal(unknown.status, 401);
  const empty = await c.post('/api/login', { username: ' ', password: '' });
  assert.equal(empty.status, 400);
  assert.deepEqual(Object.keys((await empty.json()).fields).sort(), ['password', 'username']);

  const response = await c.post('/api/login', { username: 'student', password: '123456' });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^academy_session=[0-9a-f]{64}; Path=\/; Max-Age=43200; HttpOnly; SameSite=Lax$/);
  const { user } = await response.json();
  assert.deepEqual(Object.keys(user).sort(), ['displayName', 'id', 'role', 'username']);
  assert.equal(user.role, 'student');

  const session = await (await c.get('/api/session')).json();
  assert.deepEqual(session.user, user, '会话接口与登录接口返回相同的用户信息');
  const stolen = c.jar.get('academy_session');

  const logout = await c.post('/api/logout');
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.deepEqual(await (await c.get('/api/session')).json(), { user: null });

  const replay = await fetch(`${app.url}/api/session`, { headers: { cookie: `academy_session=${stolen}` } });
  assert.deepEqual(await replay.json(), { user: null }, '退出后旧令牌不能再用');
});

test('已登录时换账号登录，新会话替换旧会话', async (t) => {
  const app = await startApp(t);
  const c = client(app.url);
  await login(c, 'student');
  const old = c.jar.get('academy_session');
  const admin = await login(c, 'admin');
  assert.equal(admin.username, 'admin');
  assert.equal((await (await c.get('/api/session')).json()).user.username, 'admin');
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
  const replay = await fetch(`${app.url}/api/session`, { headers: { cookie: `academy_session=${old}` } });
  assert.deepEqual(await replay.json(), { user: null }, '旧账号的会话已失效');
});

test('数据库只保存会话令牌的散列，过期会话无效', async (t) => {
  const app = await startApp(t);
  const c = client(app.url);
  await login(c, 'admin');
  const token = c.jar.get('academy_session');
  const rows = app.db.prepare('SELECT token_hash, expires_at FROM sessions').all();
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, token);
  app.db.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 1);
  assert.deepEqual(await (await c.get('/api/session')).json(), { user: null });
});

test('登录页提供示例账号；已登录时按安全的 next 跳转', async (t) => {
  const app = await startApp(t);
  const c = client(app.url);
  const page = await c.get('/login?next=%2Fcourses%2F1');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="login-form" data-next="\/courses\/1"/);
  for (const username of ['admin', 'student', 'student2']) assert.match(html, new RegExp(`data-username="${username}"`));

  await login(c);
  const home = await c.get('/');
  assert.match(await home.text(), /李小明/);
  const back = await c.get('/login?next=%2Fcourses%2F1');
  assert.equal(back.status, 302);
  assert.equal(back.headers.get('location'), '/courses/1');
  const evil = await c.get('/login?next=%2F%2Fevil.example');
  assert.equal(evil.headers.get('location'), '/');

  const switching = await c.get('/login?switch=1&next=%2Fadmin');
  assert.equal(switching.status, 200, 'switch=1 时已登录也显示登录表单');
  const switchHtml = await switching.text();
  assert.match(switchHtml, /id="login-form" data-next="\/admin"/);
  assert.match(switchHtml, /当前已登录为 <strong>李小明<\/strong>（学员）/);

  assert.equal(safeNextPath('/admin?tab=1'), '/admin?tab=1');
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'admin', '/login', '/api/logout', null]) {
    assert.equal(safeNextPath(bad), '/', String(bad));
  }
});

test('请求体过大或不是 JSON 对象时拒绝', async (t) => {
  const app = await startApp(t);
  const c = client(app.url);
  const big = await c.request('/api/login', { method: 'POST', body: JSON.stringify({ username: 'x'.repeat(70 * 1024) }), headers: { 'content-type': 'application/json' } });
  assert.equal(big.status, 413);
  const broken = await c.request('/api/login', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } });
  assert.equal(broken.status, 400);
  const array = await c.request('/api/login', { method: 'POST', body: '[]', headers: { 'content-type': 'application/json' } });
  assert.equal(array.status, 400);
});
