// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 linjuanjuan <jann_lim@163.com>

import test from 'node:test';
import assert from 'node:assert/strict';
import { client, login, startApp } from './helpers.js';

const enroll = (c, id, body = {}) => c.post(`/api/courses/${id}/enrollment`, body);
const cancel = (c, id, body = {}) => c.request(`/api/courses/${id}/enrollment`, { method: 'DELETE', json: body });
const list = async (c) => (await (await c.get('/api/enrollments')).json()).enrollments;

test('报名接口按本人身份隔离，拒绝游客管理员及伪造归属', async (t) => {
  const app = await startApp(t);
  const guest = client(app.url), a = client(app.url), b = client(app.url), admin = client(app.url);
  await login(a); await login(b, 'student2'); await login(admin, 'admin');
  for (const c of [guest, admin]) {
    const status = c === guest ? 401 : 403;
    assert.equal((await enroll(c, 1)).status, status);
    assert.equal((await cancel(c, 1)).status, status);
    assert.equal((await c.get('/api/enrollments')).status, status);
  }
  assert.equal((await enroll(a, 1)).status, 200);
  assert.equal((await enroll(b, 1, { userId: 2 })).status, 400);
  assert.equal((await cancel(b, 1, { userId: 2 })).status, 400);
  assert.deepEqual(await list(b), []);
  assert.equal((await list(a)).length, 1);
  await cancel(b, 1);
  assert.equal((await list(a)).length, 1);
});

test('报名无名额限制且重复并发幂等，取消再报与下架列表', async (t) => {
  const app = await startApp(t);
  const a = client(app.url), b = client(app.url), admin = client(app.url);
  await login(a); await login(b, 'student2'); await login(admin, 'admin');
  assert.deepEqual(await list(a), []);
  for (const id of [4, 999, 'abc', '01', '0']) assert.equal((await enroll(a, id)).status, 404);
  const results = await Promise.all(Array.from({ length: 8 }, () => enroll(a, 1)));
  assert.ok(results.every(r => r.status === 200));
  await enroll(b, 1); await enroll(a, 2);
  assert.equal((await list(a)).length, 2);
  assert.equal((await list(b)).length, 1);
  await admin.patch('/api/admin/courses/1', { published: false });
  const unavailable = (await list(a)).find(x => x.courseId === 1);
  assert.equal(unavailable.available, false);
  assert.deepEqual(Object.keys(unavailable).sort(), ['available', 'courseId', 'title']);
  assert.equal((await enroll(a, 1)).status, 404);
  assert.equal((await cancel(a, 1)).status, 200);
  assert.equal((await cancel(a, 1)).status, 200);
  assert.equal((await list(a)).length, 1);
  assert.equal((await list(b)).length, 1);
  await admin.patch('/api/admin/courses/1', { published: true });
  await enroll(a, 1);
  assert.equal((await list(a)).length, 2);
});

test('报名请求保留 JSON 同源校验，失败写入不报告成功', async (t) => {
  const app = await startApp(t); const c = client(app.url); await login(c);
  assert.equal((await c.request('/api/courses/1/enrollment', { method: 'POST' })).status, 415);
  assert.equal((await c.post('/api/courses/1/enrollment', {}, { headers: { origin: 'http://other.example' } })).status, 403);
  for (const body of ['{', '[]', 'null']) {
    assert.equal((await c.request('/api/courses/1/enrollment', { method: 'POST', body, headers: { 'content-type': 'application/json' } })).status, 400);
  }
  assert.equal((await enroll(c, 1, { text: 'x'.repeat(70000) })).status, 413);
  assert.deepEqual(await list(c), []);
  app.db.exec("CREATE TRIGGER fail_enrollment BEFORE INSERT ON enrollments BEGIN SELECT RAISE(ABORT, '测试写入失败'); END");
  const failure = await enroll(c, 1);
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { error: '服务暂时不可用，请稍后重试' });
  assert.deepEqual(await list(c), []);
  app.db.exec('DROP TRIGGER fail_enrollment');
  assert.equal((await enroll(c, 1)).status, 200);
  app.db.exec("CREATE TRIGGER fail_cancel BEFORE DELETE ON enrollments BEGIN SELECT RAISE(ABORT, '测试取消失败'); END");
  assert.equal((await cancel(c, 1)).status, 500);
  assert.equal((await list(c)).length, 1);
});
