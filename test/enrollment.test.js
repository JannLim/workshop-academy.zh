// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 liyan <1982119376@qq.com>

import test from 'node:test';
import assert from 'node:assert/strict';
import { client, login, startApp } from './helpers.js';

async function enrollmentsOf(c) {
  const response = await c.get('/api/enrollments');
  assert.equal(response.status, 200);
  return (await response.json()).enrollments;
}

test('未登录不能报名、取消或查看报名', async (t) => {
  const app = await startApp(t);
  const guest = client(app.url);
  assert.equal((await guest.get('/api/enrollments')).status, 401);
  assert.equal((await guest.post('/api/courses/1/enrollment')).status, 401);
  assert.equal((await guest.del('/api/courses/1/enrollment')).status, 401);
});

test('学员报名已发布课程，重复报名不新增记录', async (t) => {
  const app = await startApp(t);
  const student = client(app.url);
  await login(student);

  const created = await student.post('/api/courses/1/enrollment');
  assert.equal(created.status, 201);
  const { enrollment } = await created.json();
  assert.equal(enrollment.courseId, 1);
  assert.equal(enrollment.title, 'Python 入门：写出第一个程序');
  assert.equal(enrollment.status, 'published');
  assert.equal(enrollment.url, '/courses/1');
  assert.equal(typeof enrollment.enrolledAt, 'number');

  assert.equal((await student.post('/api/courses/1/enrollment')).status, 200);
  const list = await enrollmentsOf(student);
  assert.equal(list.length, 1);
  assert.equal(list[0].courseId, 1);

  for (const id of ['4', '999', 'abc', '0', '01']) {
    const response = await student.post(`/api/courses/${id}/enrollment`);
    assert.equal(response.status, 404, id);
  }
});

test('报名归属隔离，取消和重新报名保持幂等', async (t) => {
  const app = await startApp(t);
  const first = client(app.url);
  const second = client(app.url);
  await login(first, 'student');
  await login(second, 'student2');

  assert.equal((await first.post('/api/courses/1/enrollment')).status, 201);
  assert.equal((await second.post('/api/courses/1/enrollment')).status, 201);

  assert.equal((await enrollmentsOf(first)).length, 1);
  assert.equal((await enrollmentsOf(second)).length, 1);

  assert.equal((await second.del('/api/courses/1/enrollment')).status, 200);
  assert.equal((await enrollmentsOf(second)).length, 0);
  assert.equal((await enrollmentsOf(first)).length, 1);

  assert.equal((await second.del('/api/courses/1/enrollment')).status, 200);
  assert.equal((await second.post('/api/courses/1/enrollment')).status, 201);

  assert.equal((await first.del('/api/courses/1/enrollment')).status, 200);
  assert.equal((await enrollmentsOf(first)).length, 0);
  assert.equal((await first.post('/api/courses/1/enrollment')).status, 201);
});

test('请求体不能指定其他账号的报名', async (t) => {
  const app = await startApp(t);
  const first = client(app.url);
  const second = client(app.url);
  await login(first, 'student');
  await login(second, 'student2');

  assert.equal((await first.post('/api/courses/2/enrollment', { userId: 2 })).status, 201);
  assert.deepEqual(await enrollmentsOf(second), []);
});

test('管理员可以为自己报名，但列表只包含自己的报名', async (t) => {
  const app = await startApp(t);
  const admin = client(app.url);
  const student = client(app.url);
  await login(admin, 'admin');
  await login(student, 'student');

  assert.equal((await admin.post('/api/courses/1/enrollment')).status, 201);
  assert.equal((await student.post('/api/courses/2/enrollment')).status, 201);

  assert.deepEqual((await enrollmentsOf(admin)).map((item) => item.courseId), [1]);
  assert.deepEqual((await enrollmentsOf(student)).map((item) => item.courseId), [2]);
});

test('我的报名保留已下架课程，重新发布后恢复详情入口', async (t) => {
  const app = await startApp(t);
  const admin = client(app.url);
  const student = client(app.url);
  await login(admin, 'admin');
  await login(student, 'student');
  assert.equal((await student.post('/api/courses/1/enrollment')).status, 201);

  assert.equal((await admin.patch('/api/admin/courses/1', { published: false })).status, 200);
  const hidden = await enrollmentsOf(student);
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].status, 'unpublished');
  assert.equal(hidden[0].url, undefined);
  assert.equal((await student.get('/api/courses/1')).status, 404);

  assert.equal((await admin.patch('/api/admin/courses/1', { published: true })).status, 200);
  const shown = await enrollmentsOf(student);
  assert.equal(shown[0].status, 'published');
  assert.equal(shown[0].url, '/courses/1');
});

test('课程编辑不改变已有报名', async (t) => {
  const app = await startApp(t);
  const admin = client(app.url);
  const student = client(app.url);
  await login(admin, 'admin');
  await login(student, 'student');
  assert.equal((await student.post('/api/courses/1/enrollment')).status, 201);

  assert.equal((await admin.patch('/api/admin/courses/1', { summary: '修改后的简介' })).status, 200);
  const list = await enrollmentsOf(student);
  assert.equal(list.length, 1);
  assert.equal(list[0].courseId, 1);
});