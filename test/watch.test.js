// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 liyan <1982119376@qq.com>

import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { projectRoot } from '../src/db.js';
import { demoCourses } from '../src/seed.js';
import { listVideos, readMp4Duration } from '../src/playback.js';
import { client, login, startApp } from './helpers.js';

const mediaDir = resolve(projectRoot, 'media');

async function enroll(c, courseId) {
  const response = await c.post(`/api/courses/${courseId}/enrollment`);
  assert.ok([200, 201].includes(response.status), String(response.status));
}

test('示例视频齐全，时长与种子课程一致，体积小', () => {
  const videos = listVideos(mediaDir);
  assert.deepEqual(videos.map((v) => v.file).sort(), demoCourses.map((c) => c.videoFile).sort());
  for (const course of demoCourses) {
    const file = resolve(mediaDir, course.videoFile);
    assert.equal(readMp4Duration(file), course.durationSeconds, course.videoFile);
    assert.ok(statSync(file).size < 400 * 1024, `${course.videoFile} 应小于 400 KB`);
  }
});

test('取得播放地址需要登录、有效报名且课程已发布', async (t) => {
  const app = await startApp(t);
  const guest = client(app.url);
  const anonymous = await guest.post('/api/courses/1/play');
  assert.equal(anonymous.status, 401);
  assert.deepEqual(await anonymous.json(), { error: '请先登录后再观看' });
  assert.equal((await guest.post('/api/courses/999/play')).status, 401, '未登录先提示登录');

  const student = client(app.url);
  await login(student);
  for (const id of [4, 999]) {
    const response = await student.post(`/api/courses/${id}/play`);
    assert.equal(response.status, 404, String(id));
    assert.equal((await response.json()).error, '课程不存在或尚未发布');
  }
  const denied = await student.post('/api/courses/1/play');
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: '请先报名后再观看' });

  await enroll(student, 1);
  const before = Date.now();
  const response = await student.post('/api/courses/1/play');
  assert.equal(response.status, 200);
  const grant = await response.json();
  assert.deepEqual(Object.keys(grant).sort(), ['expiresAt', 'url']);
  assert.match(grant.url, /^\/media\/1\?expires=\d+&signature=[0-9a-f]{64}$/);
  assert.ok(grant.expiresAt >= before + 59_000 && grant.expiresAt <= Date.now() + 60_000);
  assert.equal(Number(new URL(grant.url, app.url).searchParams.get('expires')), grant.expiresAt);

  app.db.prepare('UPDATE courses SET published = 0 WHERE id = 1').run();
  assert.equal((await student.post('/api/courses/1/play')).status, 404, '取消发布后不再签发新地址');
});

test('课程页按同一资格检查显示观看状态', async (t) => {
  const app = await startApp(t);
  const guest = await (await fetch(`${app.url}/courses/2`)).text();
  assert.match(guest, /data-state="login"/);
  assert.doesNotMatch(guest, /data-action="watch"/);
  assert.doesNotMatch(guest, /data-action="enroll"/);

  const student = client(app.url);
  await login(student);
  const unenrolled = await (await student.get('/courses/2')).text();
  assert.match(unenrolled, /data-state="enroll"/);
  assert.match(unenrolled, /data-action="enroll"/);
  assert.doesNotMatch(unenrolled, /data-action="watch"/);

  await enroll(student, 2);
  const page = await (await student.get('/courses/2')).text();
  assert.match(page, /data-state="ready"/);
  assert.match(page, /data-action="watch"/);
  assert.match(page, /<video class="player-video"[^>]* hidden/);
  assert.doesNotMatch(page, /\/media\//, '页面本身不含播放地址');
});

test('未报名账号仍可浏览课程详情', async (t) => {
  const app = await startApp(t);
  const student = client(app.url);
  await login(student);
  const page = await student.get('/courses/1');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Python 入门：写出第一个程序/);
});

test('管理员没有观看豁免，报名后才能取得播放地址', async (t) => {
  const app = await startApp(t);
  const admin = client(app.url);
  await login(admin, 'admin');
  assert.equal((await admin.post('/api/courses/1/play')).status, 403);
  await enroll(admin, 1);
  assert.equal((await admin.post('/api/courses/1/play')).status, 200);
});

test('签名地址支持范围请求，篡改的地址被拒绝', async (t) => {
  const app = await startApp(t);
  const student = client(app.url);
  await login(student);
  await enroll(student, 1);
  const { url } = await (await student.post('/api/courses/1/play')).json();
  const size = statSync(resolve(mediaDir, 'python-basics.mp4')).size;

  // 播放地址本身就是授权：不带 cookie 的请求也能读取。
  const part = await fetch(`${app.url}${url}`, { headers: { range: 'bytes=0-31' } });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-type'), 'video/mp4');
  assert.equal(part.headers.get('accept-ranges'), 'bytes');
  assert.equal(part.headers.get('content-range'), `bytes 0-31/${size}`);
  const bytes = Buffer.from(await part.arrayBuffer());
  assert.equal(bytes.length, 32);
  assert.equal(bytes.toString('latin1', 4, 8), 'ftyp');

  const tail = await fetch(`${app.url}${url}`, { headers: { range: 'bytes=-10' } });
  assert.equal(tail.status, 206);
  assert.equal(tail.headers.get('content-range'), `bytes ${size - 10}-${size - 1}/${size}`);
  assert.equal((await tail.arrayBuffer()).byteLength, 10);

  const open = await fetch(`${app.url}${url}`, { headers: { range: 'bytes=100-' } });
  assert.equal(open.headers.get('content-length'), String(size - 100));
  await open.arrayBuffer();

  const whole = await fetch(`${app.url}${url}`);
  assert.equal(whole.status, 200);
  assert.equal((await whole.arrayBuffer()).byteLength, size);

  const head = await fetch(`${app.url}${url}`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(size));

  const beyond = await fetch(`${app.url}${url}`, { headers: { range: `bytes=${size}-` } });
  assert.equal(beyond.status, 416);
  assert.equal(beyond.headers.get('content-range'), `bytes */${size}`);

  const signed = new URL(url, app.url);
  const signature = signed.searchParams.get('signature');
  const expires = signed.searchParams.get('expires');
  const forged = [
    `/media/1?expires=${expires}&signature=${signature.replace(/^./, signature[0] === 'a' ? 'b' : 'a')}`,
    `/media/1?expires=${Number(expires) + 1000}&signature=${signature}`,
    `/media/2?expires=${expires}&signature=${signature}`,
    '/media/1',
    `/media/1?expires=abc&signature=${signature}`,
  ];
  for (const path of forged) {
    const response = await fetch(`${app.url}${path}`);
    assert.equal(response.status, 403, path);
    assert.deepEqual(await response.json(), { error: '播放地址无效' });
  }
  for (const path of ['/media/python-basics.mp4', '/assets/../media/python-basics.mp4', '/media/']) {
    assert.equal((await fetch(`${app.url}${path}`)).status, 404, path);
  }
});

test('播放地址到期后返回 410，重新申请即可继续', async (t) => {
  const app = await startApp(t, { playbackTtlMs: 300 });
  const student = client(app.url);
  await login(student);
  await enroll(student, 3);
  const first = await (await student.post('/api/courses/3/play')).json();
  assert.equal((await fetch(`${app.url}${first.url}`, { headers: { range: 'bytes=0-1' } })).status, 206);
  await sleep(400);
  const expired = await fetch(`${app.url}${first.url}`, { headers: { range: 'bytes=2-3' } });
  assert.equal(expired.status, 410);
  assert.deepEqual(await expired.json(), { error: '播放地址已过期，请重新获取' });
  const renewed = await (await student.post('/api/courses/3/play')).json();
  assert.equal((await fetch(`${app.url}${renewed.url}`, { headers: { range: 'bytes=2-3' } })).status, 206);
});

test('取消报名后停止签发新地址，已签发地址到期前仍可读', async (t) => {
  const app = await startApp(t, { playbackTtlMs: 500 });
  const student = client(app.url);
  await login(student);
  await enroll(student, 1);
  const grant = await (await student.post('/api/courses/1/play')).json();
  assert.equal((await fetch(`${app.url}${grant.url}`, { headers: { range: 'bytes=0-1' } })).status, 206);

  assert.equal((await student.del('/api/courses/1/enrollment')).status, 200);
  const denied = await student.post('/api/courses/1/play');
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: '请先报名后再观看' });
  assert.equal((await fetch(`${app.url}${grant.url}`, { headers: { range: 'bytes=0-1' } })).status, 206, '已签发地址到期前仍可读');

  await sleep(700);
  assert.equal((await fetch(`${app.url}${grant.url}`, { headers: { range: 'bytes=2-3' } })).status, 410);
});

test('课程下架停止新播放地址，重新发布无需重新报名', async (t) => {
  const app = await startApp(t, { playbackTtlMs: 5000 });
  const admin = client(app.url);
  const student = client(app.url);
  await login(admin, 'admin');
  await login(student, 'student');
  await enroll(student, 1);
  const grant = await (await student.post('/api/courses/1/play')).json();

  assert.equal((await admin.patch('/api/admin/courses/1', { published: false })).status, 200);
  assert.equal((await student.post('/api/courses/1/play')).status, 404);
  assert.equal((await fetch(`${app.url}${grant.url}`, { headers: { range: 'bytes=0-1' } })).status, 206);

  assert.equal((await admin.patch('/api/admin/courses/1', { published: true })).status, 200);
  assert.equal((await student.post('/api/courses/1/play')).status, 200, '重新发布后无需重新报名');
});

test('课程的视频文件缺失时返回 404', async (t) => {
  const app = await startApp(t);
  const student = client(app.url);
  await login(student);
  await enroll(student, 2);
  app.db.prepare("UPDATE courses SET video_file = 'missing-video.mp4' WHERE id = 2").run();
  const { url } = await (await student.post('/api/courses/2/play')).json();
  const response = await fetch(`${app.url}${url}`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: '视频不存在' });
});