// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com>
import test from 'node:test';
import assert from 'node:assert/strict';
import { client, login, startApp } from './helpers.js';

test('报名页面按身份和状态显示操作，列表保留下架报名', async (t) => {
  const app = await startApp(t); const guest = client(app.url), a = client(app.url), admin = client(app.url);
  assert.match(await (await guest.get('/courses/1')).text(), /登录后报名/);
  assert.equal((await guest.get('/enrollments')).status, 302);
  await login(a); await login(admin, 'admin');
  assert.equal((await admin.get('/enrollments')).status, 403);
  assert.match(await (await a.get('/enrollments')).text(), /暂无报名/);
  assert.match(await (await a.get('/courses/1')).text(), /立即报名/);
  await a.post('/api/courses/1/enrollment');
  assert.match(await (await a.get('/courses/1')).text(), /开始观看/);
  const list = await (await a.get('/enrollments')).text();
  assert.match(list, /取消报名/); assert.match(list, /失去观看资格/);
  await admin.patch('/api/admin/courses/1', { published: false });
  const down = await (await a.get('/enrollments')).text();
  assert.match(down, /课程暂不可用/); assert.doesNotMatch(down, /href="\/courses\/1"/);
  await a.request('/api/courses/1/enrollment', { method: 'DELETE', json: {} });
  assert.match(await (await a.get('/enrollments')).text(), /暂无报名/);
  assert.doesNotMatch(await (await admin.get('/courses/2')).text(), /data-action="(?:watch|enroll)"/);
});
